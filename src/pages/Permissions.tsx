import { AppLayout } from "@/components/layout/AppLayout";
import { useRole, STAFF_ROLES, ROLE_LABELS, type AppRoleName } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MODULE_NAMES = [
  "Mój dzień", "Pulpit", "Cele i OKR",
  "Zadania", "Projekty", "Tablica operacyjna", "Tablica zespołu", "Rutyny",
  "Klienci", "Umowy", "Zlecenia", "Lejek sprzedaży", "Pomysły klientów", "Rozmowy", "Mikro-interwencje",
  "Komunikator", "Skrzynka klientów", "Zgłoszenia",
  "Zespół", "Spotkania", "Kalendarz", "Nieobecności", "Sprzęt",
  "Analityki", "Retencja", "Raporty", "Raporty czasu", "Wyniki zespołu", "Notatki zespołu",
  "Automatyzacje", "Centrum automatyzacji", "Analityka zespołu",
  "Zadania cykliczne", "Sugestie", "Co nowego", "Ustawienia",
  "Dokumentacja", "Instrukcja projektu",
];

export default function Permissions() {
  const { permissions, setPermissions, refreshPermissions } = useRole();

  const getPermValue = (role: string, module: string) => {
    const p = permissions.find(p => p.role_name === role && p.module_name === module);
    return p?.can_view ?? true;
  };

  const handleToggle = async (role: AppRoleName, module: string) => {
    if (role === "superadmin" || role === "boss") return;
    const current = getPermValue(role, module);
    const newVal = !current;

    setPermissions(prev => {
      const idx = prev.findIndex(p => p.role_name === role && p.module_name === module);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], can_view: newVal };
        return updated;
      }
      return [...prev, { role_name: role, module_name: module, can_view: newVal }];
    });

    const { error } = await supabase
      .from("role_permissions")
      .update({ can_view: newVal } as any)
      .eq("role_name", role)
      .eq("module_name", module);
    if (error) {
      toast.error("Błąd zapisu: " + error.message);
      refreshPermissions();
      return;
    }
    toast.success(`${ROLE_LABELS[role]}: ${module} → ${newVal ? "widoczny" : "ukryty"}`);
  };

  return (
    <AppLayout title="Uprawnienia">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted-foreground mb-4">Macierz uprawnień — zarządzaj widocznością modułów dla poszczególnych ról.</p>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Macierz uprawnień ról</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground min-w-[200px]">Moduł</th>
                  {STAFF_ROLES.map(role => (
                    <th key={role} className="text-center py-2 px-3 font-semibold min-w-[100px]">
                      <Badge variant={role === "boss" ? "default" : "outline"} className="text-xs">{ROLE_LABELS[role]}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_NAMES.map(module => (
                  <tr key={module} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 text-foreground font-medium">{module}</td>
                    {STAFF_ROLES.map(role => (
                      <td key={role} className="text-center py-2 px-3">
                        <Checkbox
                          checked={getPermValue(role, module)}
                          disabled={role === "superadmin" || role === "boss"}
                          onCheckedChange={() => handleToggle(role, module)}
                          className={role === "superadmin" || role === "boss" ? "opacity-60" : ""}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

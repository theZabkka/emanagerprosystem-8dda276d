import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

const STAFF_ROLES = [
  { value: "boss", label: "Boss", description: "Zarząd — pełny dostęp" },
  { value: "koordynator", label: "Koordynator", description: "Zarządza zadaniami i zespołem" },
  { value: "specjalista", label: "Specjalista", description: "Realizuje zadania" },
  { value: "praktykant", label: "Praktykant", description: "Ograniczony dostęp" },
];

const DEPARTMENTS = [
  "Zarząd", "Marketing", "Design", "Development", "Sprzedaż", "HR", "Finanse", "Obsługa klienta",
];

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  role: "",
  department: "",
  phone: "",
  position: "",
};

export default function CreateStaffDialog({ open, onOpenChange, onCreated }: CreateStaffDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => setForm(initialForm);

  const handleCreate = async () => {
    if (!form.full_name.trim()) { toast.error("Podaj imię i nazwisko"); return; }
    if (!form.email.trim()) { toast.error("Podaj adres e-mail"); return; }
    if (!form.password || form.password.length < 6) { toast.error("Hasło musi mieć min. 6 znaków"); return; }
    if (!form.role) { toast.error("Wybierz rolę"); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) { toast.error("Podaj poprawny adres e-mail"); return; }

    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        department: form.department || null,
        phone: form.phone || null,
        position: form.position || null,
      };

      const { data, error } = await supabase.functions.invoke("create-staff-user", {
        body: payload,
      });

      // Edge Function returns 4xx — decode the real message
      if (error) {
        const msg = (data as any)?.error || error.message || "Nieznany błąd serwera";
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || "Nieznany błąd");

      toast.success(`Pracownik ${form.full_name} został dodany`);
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error("Błąd", { description: err.message || "Nie udało się utworzyć użytkownika" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dodaj pracownika
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name + Email */}
          <div className="space-y-1.5">
            <Label>Imię i nazwisko *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="np. Jan Kowalski"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Adres e-mail *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jan@firma.pl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Hasło *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Min. 6 znaków"
            />
          </div>

          <Separator />

          {/* Role + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rola *</Label>
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz rolę..." />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground text-xs ml-1.5">— {r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Dział</Label>
              <Select value={form.department} onValueChange={(v) => update("department", v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz dział..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Brak —</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Stanowisko</Label>
              <Input
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                placeholder="np. Senior Designer"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tworzenie...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Dodaj pracownika
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

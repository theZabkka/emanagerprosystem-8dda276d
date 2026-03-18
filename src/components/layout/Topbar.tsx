import { Search, Phone, Focus, Sun, Moon, Bell, Database, FlaskConical, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useDataSource } from "@/hooks/useDataSource";
import { useRole, ROLE_LABELS, type AppRoleName } from "@/hooks/useRole";
import { seedSupabaseDatabase } from "@/lib/seedDatabase";
import { toast } from "sonner";
import { useState } from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Pulpit" }: TopbarProps) {
  const { profile } = useAuth();
  const { dataSource, setDataSource, isDemo } = useDataSource();
  const { simulatedRole, setSimulatedRole } = useRole();
  const [isDark, setIsDark] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const toggleDataSource = () => {
    setDataSource(isDemo ? "database" : "demo");
  };

  const handleSeed = async () => {
    setSeeding(true);
    toast.info("Zasilanie bazy w toku...");
    try {
      const result = await seedSupabaseDatabase();
      toast.success(`Dodano testowe dane do Supabase! (${result.clientsCount} klientów, ${result.tasksCount} zadań)`);
    } catch (e: any) {
      toast.error("Błąd zasilania: " + (e?.message ?? "Nieznany błąd"));
    } finally {
      setSeeding(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleColors: Record<string, string> = {
    boss: "bg-amber-500/15 text-amber-700 border-amber-400/50",
    koordynator: "bg-blue-500/15 text-blue-700 border-blue-400/50",
    specjalista: "bg-emerald-500/15 text-emerald-700 border-emerald-400/50",
    praktykant: "bg-purple-500/15 text-purple-700 border-purple-400/50",
    klient: "bg-rose-500/15 text-rose-700 border-rose-400/50",
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj... ⌘K"
            className="pl-9 h-9 bg-muted border-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Role simulator */}
        <div className="flex items-center gap-1.5 mr-1">
          <UserCog className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
          <Select value={simulatedRole} onValueChange={(v) => setSimulatedRole(v as AppRoleName)}>
            <SelectTrigger className={`h-7 w-auto min-w-[110px] text-xs font-bold border ${roleColors[simulatedRole] || ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABELS) as AppRoleName[]).map(role => (
                <SelectItem key={role} value={role} className="text-xs font-medium">
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data source toggle */}
        <button
          onClick={toggleDataSource}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors mr-1 ${
            isDemo
              ? "bg-orange-500/15 text-orange-600 border border-orange-400/50 hover:bg-orange-500/25"
              : "bg-emerald-500/15 text-emerald-600 border border-emerald-400/50 hover:bg-emerald-500/25"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          {isDemo ? "DEMO" : "BAZA"}
        </button>

        {/* Seed button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={handleSeed}
          disabled={seeding}
          title="Zasil bazę danymi testowymi"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Zasil</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <Focus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
            3
          </Badge>
        </Button>
        <Avatar className="h-8 w-8 ml-2">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
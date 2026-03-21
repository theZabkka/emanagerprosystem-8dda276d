import { Search, Phone, Focus, Sun, Moon, Bell, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { seedSupabaseDatabase } from "@/lib/seedDatabase";
import { toast } from "sonner";
import { useState } from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Pulpit" }: TopbarProps) {
  const { profile } = useAuth();
  const { isClient } = useRole();
  const [isDark, setIsDark] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleSeed = async () => {
    setSeeding(true);
    toast.info("Zasilanie bazy w toku...");
    try {
      const result = await seedSupabaseDatabase();
      toast.success(`Dodano testowe dane do Supabase! (${result.clientsCount} klientów, ${result.projectsCount} projektów)`);
    } catch (e: any) {
      toast.error("Błąd zasilania: " + (e?.message ?? "Nieznany błąd"));
    } finally {
      setSeeding(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {!isClient && (
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Szukaj... ⌘K" className="pl-9 h-9 bg-muted border-0" />
          </div>
        </div>
      )}

      {isClient && <div className="flex-1" />}

      <div className="flex items-center gap-1">
        {!isClient && (
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
        )}

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

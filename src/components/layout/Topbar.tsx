import { Search, Moon, Sun, Bell, User, Settings, LogOut, X, Bug } from "lucide-react";
import { BugReportModal } from "@/components/bugs/BugReportModal";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Pulpit" }: TopbarProps) {
  const { profile, signOut } = useAuth();
  const { isClient } = useRole();
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearching(true);
    try {
      const q = `%${query}%`;
      const [tasksRes, clientsRes, projectsRes, profilesRes, ticketsRes] = await Promise.all([
        supabase.from("tasks").select("id, title, status").ilike("title", q).eq("is_archived", false).limit(5),
        supabase.from("clients").select("id, name").ilike("name", q).limit(5),
        supabase.from("projects").select("id, name").ilike("name", q).eq("is_archived", false).limit(5),
        supabase.from("profiles").select("id, full_name, role").ilike("full_name", q).limit(5),
        supabase.from("tickets").select("id, title, status").ilike("title", q).limit(5),
      ]);
      const results: any[] = [];
      (tasksRes.data || []).forEach(t => results.push({ type: "task", id: t.id, label: t.title, sub: t.status, url: `/tasks/${t.id}` }));
      (clientsRes.data || []).forEach(c => results.push({ type: "client", id: c.id, label: c.name, sub: "Klient", url: `/clients/${c.id}` }));
      (projectsRes.data || []).forEach(p => results.push({ type: "project", id: p.id, label: p.name, sub: "Projekt", url: `/projects/${p.id}` }));
      (profilesRes.data || []).forEach(u => results.push({ type: "user", id: u.id, label: u.full_name, sub: u.role, url: `/team` }));
      (ticketsRes.data || []).forEach(t => results.push({ type: "ticket", id: t.id, label: t.title, sub: t.status, url: `/admin/tickets` }));
      setSearchResults(results);
      setSearchOpen(results.length > 0);
    } catch { /* silent */ }
    setSearching(false);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleResultClick = (url: string) => {
    navigate(url);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeLabels: Record<string, string> = { task: "Zadanie", client: "Klient", project: "Projekt", user: "Osoba", ticket: "Zgłoszenie" };
  const typeColors: Record<string, string> = {
    task: "bg-primary/10 text-primary",
    client: "bg-emerald-500/10 text-emerald-700",
    project: "bg-blue-500/10 text-blue-700",
    user: "bg-violet-500/10 text-violet-700",
    ticket: "bg-amber-500/10 text-amber-700",
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {!isClient && (
        <div className="flex-1 max-w-md mx-4 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj zadań, klientów, projektów..."
              className="pl-9 h-9 bg-muted border-0"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {searchOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left text-sm transition-colors"
                    onClick={() => handleResultClick(r.url)}
                  >
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${typeColors[r.type] || ""}`}>
                      {typeLabels[r.type]}
                    </Badge>
                    <span className="truncate font-medium text-foreground">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 p-3 text-center text-sm text-muted-foreground">
                Szukam...
              </div>
            )}
          </div>
        </div>
      )}

      {isClient && <div className="flex-1" />}

      <div className="flex items-center gap-1">
        {/* Bug report button */}
        <BugReportButton />

        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                0
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Powiadomienia</p>
            </div>
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Brak nowych powiadomień</p>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Avatar className="h-7 w-7">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{profile?.full_name || "Użytkownik"}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" /> Ustawienia
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BugReportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setOpen(true)} title="Zgłoś błąd">
        <Bug className="h-4 w-4" />
      </Button>
      <BugReportModal open={open} onOpenChange={setOpen} />
    </>
  );
}

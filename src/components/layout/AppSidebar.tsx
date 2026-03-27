import { useRef } from "react";
import {
  Sun, LayoutDashboard, Target,
  CheckSquare, FolderKanban, Columns3, Users2, RotateCcw, Archive,
  Building2, FileText, Briefcase, TrendingUp, Lightbulb, MessageCircle, Zap,
  MessagesSquare, Inbox, TicketCheck,
  Users, Calendar as CalendarIcon, Video, PalmtreeIcon, Monitor,
  BarChart3, Activity, FileBarChart, Clock, Award, StickyNote,
  Bot, Workflow, Lock, RefreshCcw, Sparkles, Bell, Settings, BookOpen, FileQuestion,
  LogOut, ChevronDown, Bug
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoDark from "@/assets/logo-dark.png";

const sections = [
  {
    label: "GŁÓWNE",
    items: [
      { title: "Mój dzień", url: "/my-day", icon: Sun },
      { title: "Pulpit", url: "/dashboard", icon: LayoutDashboard },
      { title: "Cele i OKR", url: "/okr", icon: Target },
    ],
  },
  {
    label: "PRACA",
    items: [
      { title: "Zadania", url: "/tasks", icon: CheckSquare },
      { title: "Archiwum", url: "/tasks/archive", icon: Archive },
      { title: "Projekty", url: "/projects", icon: FolderKanban },
      { title: "Tablica operacyjna", url: "/operational", icon: Columns3 },
      { title: "Tablica zespołu", url: "/team-board", icon: Users2 },
      { title: "Rutyny", url: "/routines", icon: RotateCcw },
    ],
  },
  {
    label: "KLIENCI",
    items: [
      { title: "Klienci", url: "/clients", icon: Building2 },
      { title: "Umowy", url: "/contracts", icon: FileText },
      { title: "Zlecenia", url: "/orders", icon: Briefcase },
      { title: "Lejek sprzedaży", url: "/crm", icon: TrendingUp },
      { title: "Pomysły klientów", url: "/staff-ideas", icon: Lightbulb },
      { title: "Rozmowy", url: "/conversations", icon: MessageCircle },
      { title: "Mikro-interwencje", url: "/micro-interventions", icon: Zap },
    ],
  },
  {
    label: "KOMUNIKACJA",
    items: [
      { title: "Komunikator", url: "/messenger", icon: MessagesSquare },
      { title: "Skrzynka klientów", url: "/client-inbox", icon: Inbox },
      { title: "Zgłoszenia", url: "/admin/tickets", icon: TicketCheck },
      { title: "Szablony odpowiedzi", url: "/admin/templates", icon: FileText, roles: ["koordynator", "boss", "superadmin"] as string[] },
    ],
  },
  {
    label: "ZESPÓŁ",
    items: [
      { title: "Zespół", url: "/team", icon: Users },
      { title: "Spotkania", url: "/meetings", icon: Video },
      { title: "Kalendarz", url: "/team/calendar", icon: CalendarIcon },
      { title: "Nieobecności", url: "/absences", icon: PalmtreeIcon },
      { title: "Sprzęt", url: "/equipment", icon: Monitor },
    ],
  },
  {
    label: "ANALITYKA",
    items: [
      { title: "Analityki", url: "/analytics", icon: BarChart3 },
      { title: "Retencja", url: "/retention", icon: Activity },
      { title: "Raporty", url: "/reports", icon: FileBarChart },
      { title: "Raporty czasu", url: "/reports/time", icon: Clock },
      { title: "Wyniki zespołu", url: "/team-results", icon: Award },
      { title: "Notatki zespołu", url: "/team-notes", icon: StickyNote },
    ],
  },
  {
    label: "INNE",
    items: [
      { title: "Automatyzacje", url: "/automations", icon: Bot },
      { title: "Centrum automatyzacji", url: "/automation-center", icon: Workflow },
      { title: "Analityka zespołu 🔒", url: "/team-analytics", icon: Lock },
      { title: "Zadania cykliczne", url: "/recurring-tasks", icon: RefreshCcw },
      { title: "Zgłoszenia błędów", url: "/admin/bugs", icon: Bug, roles: ["koordynator", "boss", "superadmin"] as string[] },
      { title: "Sugestie", url: "/suggestions", icon: Sparkles },
      { title: "Co nowego", url: "/whats-new", icon: Bell },
      { title: "Ustawienia", url: "/settings", icon: Settings },
      { title: "Dokumentacja", url: "/docs", icon: BookOpen },
      { title: "Instrukcja projektu", url: "/project-guide", icon: FileQuestion },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, user } = useAuth();
  const { canViewModule, currentRole } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    e.target.value = "";

    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Błąd uploadu avatara");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl } as any)
      .eq("id", user.id);

    if (updateError) {
      toast.error("Błąd zapisu URL avatara");
      return;
    }

    qc.invalidateQueries({ queryKey: ["auth"] });
    toast.success("Avatar zaktualizowany!");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logoDark} alt="EMANAGER.PRO" className="h-7 w-auto" />
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-extrabold text-primary">E</span>
        )}
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          {sections.map((section) => {
            const visibleItems = section.items.filter(item => {
              if ((item as any).roles && !(item as any).roles.includes(currentRole)) return false;
              return canViewModule(item.title);
            });
            if (visibleItems.length === 0) return null;
            return (
            <SidebarGroup key={section.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.url || location.pathname.startsWith(item.url + "/")}
                        tooltip={item.title}
                      >
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            );
          })}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="px-2 py-1">
            <span className="text-[10px] text-muted-foreground">v1.2.0</span>
          </div>
        )}
        <Separator />
        <div className="p-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-full hover:ring-2 hover:ring-primary/50 transition-all"
              title="Zmień avatar"
            >
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ""} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || "Użytkownik"}
                </p>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {profile?.role?.toUpperCase() || "USER"}
                </Badge>
              </div>
            )}
            {!collapsed && (
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground p-1">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

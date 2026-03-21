import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Database, Shield, Users, Layers, Code2, Server, Zap, Lock,
  GitBranch, FolderTree, Key, Radio, BookOpen, AlertTriangle,
  CheckCircle2, ArrowRight, Workflow, Eye, Timer, MessageCircle,
  BarChart3, Calendar, Kanban, FileText,
} from "lucide-react";

/* ── tiny helpers ─────────────────────────────────────────────── */
function SectionIcon({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{label}</h2>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ── data ─────────────────────────────────────────────────────── */
const TECH_STACK = [
  { layer: "Framework", tech: "React 18 + TypeScript" },
  { layer: "Bundler", tech: "Vite 6" },
  { layer: "Styling", tech: "Tailwind CSS 3 + shadcn/ui" },
  { layer: "State", tech: "React Context + TanStack React Query v5" },
  { layer: "Routing", tech: "React Router DOM v6 (lazy loading)" },
  { layer: "Backend", tech: "Supabase (Auth, DB, Realtime, Storage, Edge Functions)" },
  { layer: "Drag & Drop", tech: "@hello-pangea/dnd" },
  { layer: "Formularze", tech: "React Hook Form + Zod" },
  { layer: "Ikony", tech: "Lucide React" },
  { layer: "Wykresy", tech: "Recharts" },
  { layer: "Daty", tech: "date-fns" },
  { layer: "Testy", tech: "Vitest + Playwright (E2E)" },
];

const DB_TABLES_MAIN = [
  { name: "profiles", desc: "Profile użytkowników (auto-tworzenie)", cols: "id, email, full_name, role, department, status, client_id, avatar_url, phone, position" },
  { name: "user_roles", desc: "Tabela ról bezpieczeństwa (RBAC)", cols: "id, user_id, role (app_role enum)" },
  { name: "clients", desc: "Klienci agencji", cols: "id, name, email, phone, status, monthly_value, score, tags, nip, address..." },
  { name: "projects", desc: "Projekty powiązane z klientami", cols: "id, name, status, client_id, manager_id, start_date, end_date, brief_data" },
  { name: "tasks", desc: "Zadania — główna encja systemu", cols: "id, title, status, priority, client_id, project_id, due_date, estimated_time, type, is_archived..." },
  { name: "task_assignments", desc: "Przypisania osób do zadań", cols: "task_id, user_id, role (primary/collaborator/reviewer)" },
  { name: "task_status_history", desc: "Historia zmian statusów", cols: "id, task_id, old_status, new_status, status_entered_at, status_exited_at, duration_seconds" },
  { name: "subtasks", desc: "Podzadania", cols: "id, task_id, title, is_completed, assigned_to" },
  { name: "checklists + checklist_items", desc: "Listy kontrolne (wymagane do review)", cols: "id, task_id, title → items: is_completed, is_na" },
  { name: "comments", desc: "Komentarze do zadań", cols: "id, task_id, content, type (internal/client), requires_client_reply" },
  { name: "time_logs", desc: "Wpisy czasu pracy", cols: "id, task_id, user_id, duration, phase, description" },
  { name: "task_materials", desc: "Materiały/pliki zadań", cols: "id, task_id, name, url, is_visible_to_client" },
  { name: "task_corrections", desc: "Zgłoszenia poprawek", cols: "id, task_id, description, severity, status" },
];

const DB_TABLES_CLIENT = [
  { name: "client_contracts", desc: "Umowy klientów" },
  { name: "client_conversations", desc: "Rozmowy (telefon, spotkanie, e-mail)" },
  { name: "client_files", desc: "Pliki klientów (Drive)" },
  { name: "client_ideas", desc: "Pomysły zgłaszane przez klientów" },
  { name: "client_invoice_data", desc: "Dane do faktury (1:1 z clients)" },
  { name: "client_offers", desc: "Oferty handlowe" },
  { name: "client_orders", desc: "Zlecenia" },
  { name: "client_social_accounts", desc: "Konta social media" },
];

const DB_TABLES_COMM = [
  { name: "channels", desc: "Kanały komunikatora (grupowe + DM)" },
  { name: "channel_members", desc: "Członkowie kanałów" },
  { name: "messages", desc: "Wiadomości z załącznikami" },
  { name: "message_reactions", desc: "Reakcje emoji" },
];

const ROLES = [
  { role: "superadmin", type: "Staff", access: "Pełny dostęp, pomija blokady", userRole: "superadmin" },
  { role: "boss", type: "Staff", access: "Pełny dostęp, pomija blokady", userRole: "moderator" },
  { role: "koordynator", type: "Staff", access: "Zarządzanie zespołem, podlega blokadzie", userRole: "moderator" },
  { role: "specjalista", type: "Staff", access: "Wykonawca, podlega blokadzie", userRole: "user" },
  { role: "praktykant", type: "Staff", access: "Ograniczony, podlega blokadzie", userRole: "user" },
  { role: "klient", type: "Klient", access: "Dostęp tylko do Portalu Klienta", userRole: "user" },
];

const RPC_FUNCTIONS = [
  { name: "change_task_status", desc: "Zmiana statusu zadania (zamyka historię, otwiera nowy wpis, ustawia verification_start_time)", security: "SECURITY DEFINER" },
  { name: "has_role", desc: "Sprawdza rolę użytkownika w user_roles", security: "SECURITY DEFINER" },
  { name: "is_staff", desc: "Sprawdza czy użytkownik jest pracownikiem", security: "SECURITY DEFINER" },
  { name: "is_task_member", desc: "Sprawdza przypisanie do zadania", security: "SECURITY DEFINER" },
  { name: "is_project_member", desc: "Sprawdza przynależność do projektu", security: "SECURITY DEFINER" },
];

const EDGE_FUNCTIONS = [
  { name: "create-staff-user", desc: "Tworzy pracownika (Auth + profil + user_role). Wymaga superadmin/boss." },
  { name: "create-client-user", desc: "Tworzy konto klienta z powiązaniem do clients." },
  { name: "create-superadmin", desc: "Tworzy konto superadmina." },
  { name: "seed-database", desc: "Zasila bazę danymi testowymi." },
];

const MODULES = [
  { path: "/dashboard", name: "Pulpit", icon: BarChart3, desc: "Staff: alerty, stat cards, pipeline, aktywność, obciążenie zespołu. Klient: projekty, do akceptacji, archiwum." },
  { path: "/my-day", name: "Mój Dzień", icon: Calendar, desc: "Osobisty widok: zadania przypisane do użytkownika, zaległe, czas." },
  { path: "/tasks", name: "Zadania", icon: Kanban, desc: "Kanban 8 kolumn + widok lista. Drag & drop, filtry, alerty, tworzenie, walidacje workflow." },
  { path: "/tasks/:id", name: "Szczegóły Zadania", icon: FileText, desc: "Brief, przypisania, podzadania, checklisty, komentarze, timer, materiały, poprawki, historia, flaga 'nie rozumiem'." },
  { path: "/tasks/archive", name: "Archiwum", icon: FileText, desc: "Tabela zarchiwizowanych zadań z filtrami." },
  { path: "/clients", name: "Klienci", icon: Users, desc: "Tabela klientów z wyszukiwaniem i filtrem statusu." },
  { path: "/clients/:id", name: "Szczegóły Klienta", icon: Users, desc: "10 zakładek: Zadania, Rozmowy, Oferty, Pomysły, Umowy, Zlecenia, Pliki, Social, Faktury, Historia." },
  { path: "/projects", name: "Projekty", icon: FolderTree, desc: "Lista projektów z klientem, statusem, managerem." },
  { path: "/projects/:id", name: "Szczegóły Projektu", icon: FolderTree, desc: "Progress, zespół, zakładki: Zadania, Budżet, Brief + AI summary." },
  { path: "/pipeline", name: "Lejek Sprzedaży", icon: GitBranch, desc: "Kanban 6 etapów (Potencjalny → Wygrane/Przegrane). Realtime." },
  { path: "/messenger", name: "Komunikator", icon: MessageCircle, desc: "Kanały, DM, załączniki, reakcje emoji, Realtime + Presence + Typing." },
  { path: "/operational", name: "Tablica Operacyjna", icon: Kanban, desc: "Read-only Kanban z 8 kolumnami statusów." },
  { path: "/team-board", name: "Tablica Zespołu", icon: Users, desc: "Kolumny per osoba + nieprzypisane. Drag & drop przypisywanie." },
  { path: "/team/calendar", name: "Kalendarz", icon: Calendar, desc: "Widok miesięczny, zadania wg due_date, kolory priorytetów." },
  { path: "/reports/time", name: "Raporty Czasu", icon: Timer, desc: "Statystyki: łącznie, wg osoby (%), wg zadania." },
  { path: "/team", name: "Zespół", icon: Users, desc: "Lista pracowników, statystyki, dodawanie przez Edge Function." },
  { path: "/okr", name: "Cele i OKR", icon: BarChart3, desc: "Cele z key results, pasek postępu, selector kwartału." },
  { path: "/settings", name: "Ustawienia", icon: Code2, desc: "Wygląd, powiadomienia, zadania, zespół, portal klienta, AI, bezpieczeństwo." },
  { path: "/settings/permissions", name: "Uprawnienia", icon: Shield, desc: "Macierz moduły × role, checkboxy widoczności, persystowane w DB." },
  { path: "/automations", name: "Automatyzacje", icon: Zap, desc: "Predefiniowane automatyzacje z triggerami i akcjami." },
  { path: "/staff-ideas", name: "Pomysły (staff)", icon: Eye, desc: "Wszystkie pomysły klientów, zmiana statusu inline." },
  { path: "/client-ideas", name: "Pomysły (klient)", icon: Eye, desc: "Pomysły klienta, dialog zgłaszania nowego." },
  { path: "/whats-new", name: "Co nowego", icon: BookOpen, desc: "Changelog z wersjami i listą zmian." },
];

const WORKFLOW_TRANSITIONS = [
  { from: "Dowolna zmiana", validation: "Zadanie musi mieć ≥1 przypisaną osobę" },
  { from: "in_progress → review", validation: "100% checklisty completed / N/A" },
  { from: "review → client_review", validation: "Modal potwierdzenia odpowiedzialności" },
  { from: "corrections → client_review", validation: "Modal potwierdzenia odpowiedzialności" },
  { from: "→ client_review", validation: "Możliwe tylko z review lub corrections" },
];

const HOOKS = [
  { name: "useAuth", file: "hooks/useAuth.tsx", desc: "Context: session, user, profile, signIn, signOut" },
  { name: "useRole", file: "hooks/useRole.tsx", desc: "Context: currentRole, isClient, clientId, canViewModule" },
  { name: "useStaffMembers", file: "hooks/useStaffMembers.ts", desc: "Query: lista aktywnych pracowników" },
  { name: "useDashboardData", file: "components/dashboard/useDashboardData.ts", desc: "Agregacja statystyk dashboardu" },
  { name: "useRoutePrefetch", file: "hooks/useRoutePrefetch.ts", desc: "Prefetch danych nawigacji" },
];

const REALTIME_SUBS = [
  { module: "TaskDetail", tables: "subtasks, comments, time_logs, status_history, assignments, checklists, materials, corrections" },
  { module: "Messenger", tables: "messages, reactions + Presence + Broadcast (typing)" },
  { module: "Pipeline", tables: "pipeline_deals" },
  { module: "Dashboard", tables: "activity_log (INSERT)" },
  { module: "FreezeOverlay", tables: "Polling co 30s (refetchInterval)" },
];

/* ── PAGE ─────────────────────────────────────────────────────── */
export default function Documentation() {
  return (
    <AppLayout title="Dokumentacja">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HERO */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                  EMANAGER.PRO — Dokumentacja
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Pełna dokumentacja techniczna i biznesowa systemu CRM / Project Management.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">v1.2.0</Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  React 18
                </Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Supabase
                </Badge>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-6">
              <InfoRow label="Data aktualizacji" value="2026-03-21" />
              <InfoRow label="Stron" value="30+" />
              <InfoRow label="Tabel DB" value="25+" />
              <InfoRow label="Edge Functions" value="4" />
            </div>
          </CardContent>
        </Card>

        {/* GOLDEN RULE */}
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground">ZŁOTA ZASADA SYSTEMOWA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Przy każdej modyfikacji kodu, dodaniu nowej funkcji czy zmianie w bazie danych — 
                  ta dokumentacja <span className="font-semibold text-foreground">MUSI być zaktualizowana</span> jako 
                  ostatni krok, aby zawsze odzwierciedlała stan kodu 1:1.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MAIN CONTENT */}
        <Accordion type="multiple" defaultValue={["tech", "db", "roles", "modules", "workflow"]} className="space-y-3">

          {/* 1 — TECH STACK */}
          <AccordionItem value="tech" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Code2} label="Stos Technologiczny" />
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Warstwa</TableHead>
                    <TableHead>Technologia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TECH_STACK.map((t) => (
                    <TableRow key={t.layer}>
                      <TableCell className="font-medium">{t.layer}</TableCell>
                      <TableCell>{t.tech}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "100% danych z Supabase — brak mock data",
                  "Lazy loading wszystkich stron",
                  "Skeleton loadery dla stanów ładowania",
                  "Polski język interfejsu",
                  "Design system oparty na tokenach HSL",
                ].map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2 — DATABASE */}
          <AccordionItem value="db" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Database} label="Schemat Bazy Danych" />
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
              {/* main tables */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tabele główne</h4>
                <div className="space-y-2">
                  {DB_TABLES_MAIN.map((t) => (
                    <Card key={t.name} className="border-border/50">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="font-mono text-xs shrink-0 mt-0.5">
                            {t.name}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{t.desc}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.cols}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* client tables */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tabele klienckie</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DB_TABLES_CLIENT.map((t) => (
                    <div key={t.name} className="flex items-center gap-2 text-sm border rounded-md p-2">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{t.name}</Badge>
                      <span className="text-muted-foreground">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* comm tables */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tabele komunikacji</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DB_TABLES_COMM.map((t) => (
                    <div key={t.name} className="flex items-center gap-2 text-sm border rounded-md p-2">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{t.name}</Badge>
                      <span className="text-muted-foreground">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* pipeline + system */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <Badge variant="outline" className="font-mono text-xs">pipeline_deals</Badge>
                  <span className="text-muted-foreground">Szanse sprzedażowe</span>
                </div>
                <div className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <Badge variant="outline" className="font-mono text-xs">role_permissions</Badge>
                  <span className="text-muted-foreground">Macierz uprawnień</span>
                </div>
                <div className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <Badge variant="outline" className="font-mono text-xs">activity_log</Badge>
                  <span className="text-muted-foreground">Log aktywności</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3 — RPC & EDGE FUNCTIONS */}
          <AccordionItem value="rpc" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Server} label="Funkcje RPC & Edge Functions" />
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Funkcje bazodanowe (RPC)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funkcja</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="w-[140px]">Bezpieczeństwo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RPC_FUNCTIONS.map((f) => (
                      <TableRow key={f.name}>
                        <TableCell className="font-mono text-xs">{f.name}</TableCell>
                        <TableCell className="text-sm">{f.desc}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-[10px]">{f.security}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Edge Functions</h4>
                <div className="space-y-2">
                  {EDGE_FUNCTIONS.map((f) => (
                    <div key={f.name} className="flex items-start gap-2 text-sm border rounded-md p-3">
                      <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono font-medium">{f.name}</span>
                        <p className="text-muted-foreground text-xs mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4 — ROLES */}
          <AccordionItem value="roles" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Shield} label="System Ról i Uprawnień (RBAC)" />
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rola</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Dostęp</TableHead>
                    <TableHead>user_roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLES.map((r) => (
                    <TableRow key={r.role}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{r.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={r.type === "Staff" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.access}</TableCell>
                      <TableCell className="font-mono text-xs">{r.userRole}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Warstwy autoryzacji</h4>
                {[
                  { label: "profiles.role", desc: "Rola wyświetlana w UI, steruje logiką frontendu" },
                  { label: "user_roles", desc: "Tabela bezpieczeństwa używana w RLS (admin/moderator/user/superadmin)" },
                  { label: "role_permissions", desc: "Macierz widoczności modułów sidebar'a (/settings/permissions)" },
                ].map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0 mt-0.5">{i + 1}</Badge>
                    <div>
                      <span className="font-mono font-medium">{l.label}</span>
                      <span className="text-muted-foreground ml-2">— {l.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Portal Klienta
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1 text-muted-foreground">
                  <p>• ClientSidebar: Mój Dashboard, Zgłoś pomysł</p>
                  <p>• Widzi materiały z <code className="bg-muted px-1 rounded">is_visible_to_client = true</code></p>
                  <p>• Komentarze z <code className="bg-muted px-1 rounded">requires_client_reply = true</code></p>
                  <p>• Może akceptować/odrzucać zadania w <code className="bg-muted px-1 rounded">client_review</code></p>
                  <p>• Zgłasza pomysły z <code className="bg-muted px-1 rounded">/client-ideas</code></p>
                </CardContent>
              </Card>

              <Card className="border-warning/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Coordinator Freeze Overlay
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1 text-muted-foreground">
                  <p>• Blokuje UI gdy zadanie w statusie <code className="bg-muted px-1 rounded">review</code> dłużej niż 60 min</p>
                  <p>• Czas liczony z <code className="bg-muted px-1 rounded">status_entered_at</code> w task_status_history</p>
                  <p>• <strong>superadmin/boss</strong> — informacyjny banner (nie blokuje)</p>
                  <p>• <strong>koordynator/specjalista/praktykant</strong> — pełna blokada z listą zadań i przyciskami nawigacji</p>
                  <p>• Znika automatycznie gdy zadania opuszczą review</p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* 5 — MODULES */}
          <AccordionItem value="modules" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Layers} label="Moduły i Strony" />
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {MODULES.map((m) => (
                  <div key={m.path} className="flex items-start gap-3 border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <m.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.name}</span>
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{m.path}</code>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                + 19 stron placeholder (Stub Pages): Rutyny, Umowy, Zlecenia, Rozmowy, Mikro-interwencje, 
                Skrzynka klientów, Zgłoszenia, Spotkania, Nieobecności, Sprzęt, Analityki, Retencja, 
                Raporty, Wyniki zespołu, Notatki zespołu, Analityka zespołu, Zadania cykliczne, Sugestie, Instrukcja projektu.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 6 — WORKFLOW */}
          <AccordionItem value="workflow" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Workflow} label="Workflow Zadań" />
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
              {/* status flow */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Przepływ statusów</h4>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {["new", "todo", "in_progress", "review", "client_review", "client_verified", "closed"].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-1">
                      <Badge variant="outline" className="font-mono">{s}</Badge>
                      {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs mt-2 ml-4">
                  <span className="text-muted-foreground">Odgałęzienia:</span>
                  <Badge variant="outline" className="font-mono">corrections</Badge>
                  <Badge variant="outline" className="font-mono">waiting_for_client</Badge>
                  <Badge variant="outline" className="font-mono">cancelled</Badge>
                </div>
              </div>

              {/* validations */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Walidacje przejść</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Przejście</TableHead>
                      <TableHead>Walidacja</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WORKFLOW_TRANSITIONS.map((w) => (
                      <TableRow key={w.from}>
                        <TableCell className="font-mono text-xs">{w.from}</TableCell>
                        <TableCell className="text-sm">{w.validation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* modals */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Modalne okna workflow</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { name: "ChecklistBlockModal", desc: "Blokuje przejście do review bez checklisty" },
                    { name: "ResponsibilityModal", desc: "Potwierdzenie odpowiedzialności" },
                    { name: "NotUnderstoodModal", desc: "Zgłoszenie 'nie rozumiem'" },
                    { name: "ClientReviewModal", desc: "Akceptacja/odrzucenie przez klienta" },
                  ].map((m) => (
                    <div key={m.name} className="border rounded-md p-2 text-sm">
                      <span className="font-mono font-medium text-xs">{m.name}</span>
                      <p className="text-muted-foreground text-xs">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7 — HOOKS */}
          <AccordionItem value="hooks" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Code2} label="Kluczowe Hooki" />
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hook</TableHead>
                    <TableHead>Plik</TableHead>
                    <TableHead>Opis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {HOOKS.map((h) => (
                    <TableRow key={h.name}>
                      <TableCell className="font-mono text-xs font-medium">{h.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.file}</TableCell>
                      <TableCell className="text-sm">{h.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>

          {/* 8 — REALTIME */}
          <AccordionItem value="realtime" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Radio} label="Realtime & Subskrypcje" />
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Moduł</TableHead>
                    <TableHead>Subskrypcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REALTIME_SUBS.map((r) => (
                    <TableRow key={r.module}>
                      <TableCell className="font-medium text-sm">{r.module}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.tables}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>

          {/* 9 — SECURITY */}
          <AccordionItem value="security" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={Lock} label="Bezpieczeństwo" />
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                {[
                  { label: "RLS", desc: "Wszystkie tabele mają włączone Row Level Security" },
                  { label: "SELECT", desc: "Większość tabel: authenticated (wszyscy zalogowani)" },
                  { label: "INSERT/UPDATE", desc: "Ograniczone przez is_staff(), has_role(), is_task_member()" },
                  { label: "Security Definer", desc: "Funkcje omijają RLS aby uniknąć rekursji" },
                  { label: "Edge Functions", desc: "Wymagają SUPABASE_SERVICE_ROLE_KEY" },
                ].map((s) => (
                  <div key={s.label} className="flex items-start gap-2 text-sm">
                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground ml-2">— {s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Zmienne środowiskowe</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zmienna</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Opis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">VITE_SUPABASE_URL</TableCell>
                      <TableCell><Badge variant="outline">Publiczna</Badge></TableCell>
                      <TableCell className="text-sm">URL projektu Supabase</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</TableCell>
                      <TableCell><Badge variant="outline">Publiczna</Badge></TableCell>
                      <TableCell className="text-sm">Anon key</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</TableCell>
                      <TableCell><Badge variant="destructive">Secret</Badge></TableCell>
                      <TableCell className="text-sm">Klucz serwisowy (Edge Functions)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 10 — STORAGE */}
          <AccordionItem value="storage" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <SectionIcon icon={FolderTree} label="Storage (Supabase)" />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="font-mono text-sm font-medium">chat_attachments</div>
                    <p className="text-xs text-muted-foreground mt-1">Załączniki wiadomości komunikatora</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">Prywatny</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="font-mono text-sm font-medium">task_materials</div>
                    <p className="text-xs text-muted-foreground mt-1">Materiały/pliki zadań</p>
                    <Badge className="mt-2 text-[10px] bg-primary/10 text-primary border-primary/20">Publiczny</Badge>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
}

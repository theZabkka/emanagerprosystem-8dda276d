import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDataSource } from "@/hooks/useDataSource";
import { supabase } from "@/integrations/supabase/client";
import {
  mockClients, mockProjects, mockTasks, mockTaskAssignments, mockProfiles, mockPipelineDeals,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import {
  ArrowLeft, Phone, MessageSquare, DollarSign, ListTodo, AlertTriangle, PhoneCall,
  Copy, Check, CheckCircle2, Circle, Search, Plus, LayoutGrid, List, Timer,
} from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  active: "AKTYWNY", potential: "POTENCJALNY", negotiations: "NEGOCJACJE", project: "PROJEKT", inactive: "NIEAKTYWNY",
};
const statusColors: Record<string, string> = {
  active: "bg-green-600/15 text-green-700 border-green-600/30",
  potential: "bg-info/15 text-info-foreground border-info/30",
  negotiations: "bg-warning/15 text-warning-foreground border-warning/30",
  project: "bg-primary/15 text-primary border-primary/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const CLIENT_TABS = [
  { key: "tasks", label: "Zadania" },
  { key: "conversations", label: "Rozmowy" },
  { key: "offers", label: "Oferty" },
  { key: "ideas", label: "Pomysły" },
  { key: "contracts", label: "Umowy" },
  { key: "orders", label: "Zlecenia" },
  { key: "files", label: "Pliki (Drive)" },
  { key: "social", label: "Social Media" },
  { key: "billing", label: "Dane do faktury" },
  { key: "history", label: "Historia" },
  { key: "scope", label: "Zakres współpracy" },
];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { isDemo } = useDataSource();
  const [activeTab, setActiveTab] = useState("tasks");
  const [copied, setCopied] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // ─── Fetch client ──────────────────────────────────────────────
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["client-detail", id, isDemo],
    queryFn: async () => {
      if (isDemo) return mockClients.find(c => c.id === id) || null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ─── Fetch projects for this client ────────────────────────────
  const { data: projects } = useQuery({
    queryKey: ["client-projects", id, isDemo],
    queryFn: async () => {
      if (isDemo) return mockProjects.filter(p => p.client_id === id);
      const { data } = await supabase.from("projects").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch tasks for this client ──────────────────────────────
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks", id, isDemo],
    queryFn: async () => {
      if (isDemo) return mockTasks.filter(t => t.client_id === id);
      const { data } = await supabase.from("tasks").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch profiles & assignments ─────────────────────────────
  const { data: profiles } = useQuery({
    queryKey: ["profiles-all", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles;
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["client-assignments", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        const taskIds = mockTasks.filter(t => t.client_id === id).map(t => t.id);
        return mockTaskAssignments.filter(a => taskIds.includes(a.task_id));
      }
      const { data: clientTasks } = await supabase.from("tasks").select("id").eq("client_id", id!);
      if (!clientTasks?.length) return [];
      const taskIds = clientTasks.map(t => t.id);
      const { data } = await supabase.from("task_assignments").select("*").in("task_id", taskIds);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Fetch deals for this client ──────────────────────────────
  const { data: deals } = useQuery({
    queryKey: ["client-deals", id, isDemo],
    queryFn: async () => {
      if (isDemo) return mockPipelineDeals.filter(d => d.client_id === id);
      const { data } = await supabase.from("pipeline_deals").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // ─── Computed values ──────────────────────────────────────────
  const activeTasks = useMemo(() => (tasks || []).filter((t: any) =>
    ["todo", "in_progress", "review", "corrections", "client_review"].includes(t.status)
  ), [tasks]);

  const openBugs = useMemo(() => (tasks || []).filter((t: any) => t.bug_severity && t.status !== "done" && t.status !== "cancelled"), [tasks]);

  const onboardingSteps = useMemo(() => {
    if (!client) return [];
    const steps = (client as any).onboarding_steps;
    if (Array.isArray(steps)) return steps;
    try { return JSON.parse(steps || "[]"); } catch { return []; }
  }, [client]);

  const onboardingCompleted = onboardingSteps.filter((s: any) => s.completed).length;
  const onboardingTotal = onboardingSteps.length;
  const onboardingPercent = onboardingTotal > 0 ? (onboardingCompleted / onboardingTotal) * 100 : 0;

  const publicUrl = useMemo(() => {
    const token = (client as any)?.public_status_token;
    if (!token) return null;
    return `${window.location.origin}/status/${token}`;
  }, [client]);

  // ─── Tab counts ───────────────────────────────────────────────
  const tabCounts: Record<string, number> = useMemo(() => ({
    tasks: activeTasks.length,
    conversations: 1,
    offers: (deals || []).length,
    ideas: 0,
    contracts: 0,
    orders: 0,
    files: 0,
    social: 0,
    billing: 0,
    history: 0,
    scope: 0,
  }), [activeTasks, deals]);

  // ─── Filtered tasks ───────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let ft = tasks || [];
    if (taskSearch) ft = ft.filter((t: any) => t.title.toLowerCase().includes(taskSearch.toLowerCase()));
    if (taskStatusFilter !== "all") ft = ft.filter((t: any) => t.status === taskStatusFilter);
    if (taskPriorityFilter !== "all") ft = ft.filter((t: any) => t.priority === taskPriorityFilter);
    return ft;
  }, [tasks, taskSearch, taskStatusFilter, taskPriorityFilter]);

  // ─── Group tasks by project ───────────────────────────────────
  const tasksByProject = useMemo(() => {
    const groups: Record<string, { project: any; tasks: any[] }> = {};
    (filteredTasks || []).forEach((t: any) => {
      const pId = t.project_id || "__none__";
      if (!groups[pId]) {
        const proj = (projects || []).find((p: any) => p.id === pId);
        groups[pId] = { project: proj || { id: "__none__", name: "Bez projektu" }, tasks: [] };
      }
      groups[pId].tasks.push(t);
    });
    return Object.values(groups);
  }, [filteredTasks, projects]);

  // ─── Status change handler for kanban ─────────────────────────
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (isDemo) {
      toast.info("W trybie demo zmiana statusu jest symulowana");
      return;
    }
    await supabase.from("tasks").update({ status: newStatus as any }).eq("id", taskId);
  };

  // ─── Copy link ────────────────────────────────────────────────
  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link skopiowany!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Timer ────────────────────────────────────────────────────
  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Timer effect
  useState(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  });

  if (loadingClient) {
    return <AppLayout title="Klient"><div className="flex items-center justify-center h-64 text-muted-foreground">Ładowanie...</div></AppLayout>;
  }

  if (!client) {
    return <AppLayout title="Klient"><div className="text-center py-16 text-muted-foreground">Nie znaleziono klienta</div></AppLayout>;
  }

  return (
    <AppLayout title={client.name}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div>
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-4 w-4" /> Wróć do klientów
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{client.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {client.contact_person || "—"} · {client.email || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="bg-green-600/10 border-green-600/30 text-green-700 hover:bg-green-600/20">
                <Phone className="h-4 w-4 mr-1" /> Zadzwoń
              </Button>
              <Button size="sm" variant="outline" className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20">
                <MessageSquare className="h-4 w-4 mr-1" /> SMS
              </Button>
              <Badge variant="outline" className={`text-xs font-bold px-3 py-1 ${statusColors[client.status || "active"]}`}>
                {statusLabels[client.status || "active"]}
              </Badge>
            </div>
          </div>
        </div>

        {/* ─── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Wartość miesięczna</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">
                    {(client.monthly_value || 0).toLocaleString("pl-PL")} zł
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Aktywne zadania</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{activeTasks.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Otwarte zgłoszenia</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">{openBugs.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Rozmowy</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1">1</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Onboarding + Public Status ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Onboarding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-wider text-foreground">ONBOARDING</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-muted-foreground">{onboardingCompleted}/{onboardingTotal} kroków</span>
                  <span className="font-bold text-primary">{Math.round(onboardingPercent)}%</span>
                </div>
                <Progress value={onboardingPercent} className="h-2 [&>div]:bg-primary" />
              </div>
              {onboardingTotal === 0 ? (
                <p className="text-xs text-muted-foreground">Brak kroków onboardingu</p>
              ) : (
                <ul className="space-y-2">
                  {onboardingSteps.map((step: any, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Public Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold tracking-wider text-foreground">PUBLICZNA STRONA STATUSU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Udostępnij klientowi link do publicznej strony z postępem prac. Klient może zobaczyć status zadań bez logowania.
              </p>
              {publicUrl ? (
                <div className="flex gap-2">
                  <Input value={publicUrl} readOnly className="text-xs bg-muted font-mono" />
                  <Button size="sm" onClick={handleCopy} className="flex-shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "Skopiowano" : "Kopiuj"}</span>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Brak tokenu — link nie został jeszcze wygenerowany.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Tabs Navigation ────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-1 flex w-max">
              {CLIENT_TABS.map(tab => {
                const count = tabCounts[tab.key] || 0;
                const isActive = activeTab === tab.key;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className={`text-xs font-semibold px-3 py-2 rounded-md transition-colors data-[state=active]:shadow-none ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ─── Tasks Tab ────────────────────────────────────── */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Szukaj zadania..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="todo">Do zrobienia</SelectItem>
                    <SelectItem value="in_progress">W realizacji</SelectItem>
                    <SelectItem value="review">Weryfikacja</SelectItem>
                    <SelectItem value="corrections">Poprawki</SelectItem>
                    <SelectItem value="client_review">Do akceptacji</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Priorytet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="critical">Pilny</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="low">Niski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nowe zadanie</Button>
                <div className="flex bg-muted rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-1.5 rounded ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks grouped by project */}
            {tasksByProject.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Brak zadań dla tego klienta</div>
            ) : (
              tasksByProject.map(group => (
                <div key={group.project.id} className="space-y-2">
                  <h3 className="text-xs font-extrabold tracking-widest text-foreground uppercase border-b border-border pb-1.5">
                    {group.project.name}
                  </h3>
                  <TaskKanbanBoard
                    tasks={group.tasks}
                    profiles={profiles || []}
                    assignments={assignments || []}
                    clients={[client]}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              ))
            )}
          </TabsContent>

          {/* ─── Other Tabs (stub) ────────────────────────────── */}
          {CLIENT_TABS.filter(t => t.key !== "tasks").map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Sekcja „{tab.label}" — wkrótce dostępna
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ─── Floating Timer Pill ──────────────────────────────── */}
      <button
        onClick={() => {
          setTimerRunning(!timerRunning);
          if (timerRunning) setTimerSeconds(0);
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-green-700 transition-colors"
      >
        <Timer className="h-4 w-4" />
        <span className="text-sm font-bold">{formatTimer(timerSeconds)}</span>
        <span className="text-xs opacity-80">{client.name}</span>
      </button>
    </AppLayout>
  );
}

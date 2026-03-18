import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockTasks, mockClients, mockProjects, mockTaskAssignments, mockProfiles } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List, AlertCircle, Clock, Eye, Layers } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

function enrichDemoTasks(statusFilter: string, priorityFilter: string) {
  let tasks = mockTasks.map(t => {
    const assignments = mockTaskAssignments
      .filter(a => a.task_id === t.id)
      .map(a => ({ ...a, profiles: mockProfiles.find(p => p.id === a.user_id) || null }));
    const client = mockClients.find(c => c.id === t.client_id);
    const project = mockProjects.find(p => p.id === t.project_id);
    return { ...t, task_assignments: assignments, clients: client ? { name: client.name } : null, projects: project ? { name: project.name } : null };
  });
  if (statusFilter !== "all") tasks = tasks.filter(t => t.status === statusFilter);
  if (priorityFilter !== "all") tasks = tasks.filter(t => t.priority === priorityFilter);
  return tasks;
}

export default function Tasks() {
  const { user } = useAuth();
  const { isDemo } = useDataSource();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["tasks", statusFilter, priorityFilter, isDemo],
    queryFn: async () => {
      if (isDemo) return enrichDemoTasks(statusFilter, priorityFilter);
      let query = supabase
        .from("tasks")
        .select("*, clients(name), projects(name), task_assignments(user_id, role, profiles:user_id(full_name))")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Apply search and type filter
  const filteredTasks = (tasks || []).filter((t: any) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === "parent") return !(t as any).parent_task_id && (tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    if (typeFilter === "subtask") return !!(t as any).parent_task_id;
    if (typeFilter === "standalone") return !(t as any).parent_task_id && !(tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    return true;
  });

  // Alert counts
  const allTasks = tasks || [];
  const unassignedCount = allTasks.filter((t: any) => {
    const hasAssignment = isDemo
      ? mockTaskAssignments.some(a => a.task_id === t.id && a.role === "primary")
      : t.task_assignments?.some((a: any) => a.role === "primary");
    return !hasAssignment && t.status !== "done" && t.status !== "cancelled";
  }).length;
  const reviewCount = allTasks.filter((t: any) => t.status === "review").length;
  const clientReviewCount = allTasks.filter((t: any) => t.status === "client_review").length;

  async function handleCreate() {
    if (!newTask.title.trim()) { toast.error("Podaj nazwę zadania"); return; }
    if (isDemo) { toast.info("W trybie demo nie można tworzyć zadań"); return; }
    const { error } = await supabase.from("tasks").insert({
      title: newTask.title, description: newTask.description,
      priority: newTask.priority as any, type: newTask.type || null,
      created_by: user?.id,
    });
    if (error) { toast.error("Błąd", { description: error.message }); return; }
    toast.success("Zadanie utworzone");
    setNewTask({ title: "", description: "", priority: "medium", type: "" });
    setIsCreateOpen(false);
    refetch();
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (isDemo) {
      queryClient.setQueryData(["tasks", statusFilter, priorityFilter, isDemo], (old: any[]) =>
        old?.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t)
      );
      toast.success("Status zaktualizowany (demo)");
      return;
    }
    const { error } = await supabase.from("tasks").update({ status: newStatus as any, updated_at: new Date().toISOString() }).eq("id", taskId);
    if (error) { toast.error("Błąd aktualizacji statusu"); return; }
    toast.success("Status zaktualizowany");
    refetch();
  }

  return (
    <AppLayout title="Zadania">
      <div className="space-y-4 mx-auto">
        {/* Alert Banners */}
        {unassignedCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-destructive text-destructive-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold text-sm">{unassignedCount} zadań nieprzypisanych.</span>
            </div>
            <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={() => setStatusFilter("all")}>Przypisz</Button>
          </div>
        )}
        {reviewCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3 rounded-xl" style={{ background: "hsl(38, 92%, 50%)", color: "white" }}>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold text-sm">{reviewCount} oczekuje na weryfikację.</span>
            </div>
            <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={() => setStatusFilter("review")}>Zweryfikuj</Button>
          </div>
        )}
        {clientReviewCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3 rounded-xl" style={{ background: "hsl(45, 93%, 47%)", color: "white" }}>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <span className="font-semibold text-sm">{clientReviewCount} czeka na akceptację klienta.</span>
            </div>
            <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={() => setStatusFilter("client_review")}>Zobacz</Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Szukaj zadań..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 text-sm" />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] h-9 text-sm"><SelectValue placeholder="Wszystkie statusy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="new">Nowe</SelectItem>
                <SelectItem value="todo">Do zrobienia</SelectItem>
                <SelectItem value="in_progress">W realizacji</SelectItem>
                <SelectItem value="review">Weryfikacja</SelectItem>
                <SelectItem value="corrections">Poprawki</SelectItem>
                <SelectItem value="client_review">Akceptacja klienta</SelectItem>
                <SelectItem value="done">Gotowe</SelectItem>
                <SelectItem value="cancelled">Anulowane</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[170px] h-9 text-sm"><SelectValue placeholder="Wszystkie priorytety" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie priorytety</SelectItem>
                {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Wszystkie typy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="parent">Tylko nadrzędne</SelectItem>
                <SelectItem value="subtask">Tylko podzadania</SelectItem>
                <SelectItem value="standalone">Tylko samodzielne</SelectItem>
              </SelectContent>
            </Select>

            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 h-9 border rounded-md bg-card">
              <Layers className="h-3.5 w-3.5" />
              Pokaż podzadania
            </button>

            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden border">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                title="Widok listy"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 transition-colors ${viewMode === "kanban" ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                title="Widok Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9">
                <Plus className="h-4 w-4 mr-1" /> Nowe zadanie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nowe zadanie</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nazwa zadania *</Label>
                  <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Nazwa zadania" />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priorytet</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Input value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} placeholder="np. Grafika" />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Utwórz zadanie</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* View content */}
        {viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            profiles={isDemo ? mockProfiles : []}
            assignments={isDemo ? mockTaskAssignments : filteredTasks.flatMap((t: any) => (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id })))}
            clients={isDemo ? mockClients : filteredTasks.map((t: any) => t.clients ? { id: t.client_id, name: t.clients.name } : null).filter(Boolean)}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <TaskListView tasks={filteredTasks} isLoading={isLoading} />
        )}
      </div>
    </AppLayout>
  );
}

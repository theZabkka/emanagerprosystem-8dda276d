import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const statusLabels: Record<string, string> = {
  new: "Nowe", todo: "Do zrobienia", in_progress: "W trakcie", review: "Weryfikacja",
  corrections: "Poprawki", client_review: "Akceptacja klienta", done: "Gotowe", cancelled: "Anulowane",
};
const statusColors: Record<string, string> = {
  new: "bg-muted text-muted-foreground", todo: "bg-info/15 text-info-foreground", in_progress: "bg-warning/15 text-warning-foreground",
  review: "bg-primary/15 text-primary", corrections: "bg-destructive/15 text-destructive",
  client_review: "bg-warning/15 text-warning-foreground", done: "bg-success/15 text-foreground", cancelled: "bg-muted text-muted-foreground",
};
const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };
const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground", high: "bg-warning text-warning-foreground",
  medium: "bg-info/15 text-info-foreground", low: "bg-muted text-muted-foreground",
};

export default function Tasks() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", type: "" });

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["tasks", statusFilter, priorityFilter],
    queryFn: async () => {
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

  const filteredTasks = tasks?.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  async function handleCreate() {
    if (!newTask.title.trim()) { toast.error("Podaj nazwę zadania"); return; }
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

  function timeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    const hours = Math.floor(diff / 3600000);
    return `${hours}h`;
  }

  return (
    <AppLayout title="Zadania">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Szukaj zadania..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priorytet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nowe zadanie</Button>
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

        {/* Tasks table */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Zadanie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Czas w statusie</TableHead>
                <TableHead>Priorytet</TableHead>
                <TableHead>Przypisano</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Klient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Brak zadań</TableCell></TableRow>
              ) : (
                filteredTasks.map((task: any) => {
                  const assignee = task.task_assignments?.find((a: any) => a.role === "primary");
                  return (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link to={`/tasks/${task.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{task.id.slice(0, 8)}</p>
                              <p className="font-medium text-sm">{task.title}</p>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusColors[task.status] || ""}`}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{timeSince(task.updated_at || task.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${priorityColors[task.priority] || ""}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-muted">{assignee.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignee.profiles?.full_name}</span>
                          </div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString("pl-PL") : "—"}</TableCell>
                      <TableCell className="text-sm">{task.clients?.name || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

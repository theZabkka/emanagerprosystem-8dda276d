import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronRight, Plus, Send, Clock, Play, Pause, FileText, Link as LinkIcon,
  CheckCircle2, MessageCircle, History, Zap
} from "lucide-react";

const statusLabels: Record<string, string> = {
  new: "Nowe", todo: "Do zrobienia", in_progress: "W trakcie", review: "Weryfikacja",
  corrections: "Poprawki", client_review: "Akceptacja klienta", done: "Gotowe", cancelled: "Anulowane",
};
const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("internal");
  const [newSubtask, setNewSubtask] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Task data
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, clients(name), projects(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Assignments
  const { data: assignments } = useQuery({
    queryKey: ["task-assignments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_assignments")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .eq("task_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Subtasks
  const { data: subtasks } = useQuery({
    queryKey: ["subtasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("subtasks").select("*").eq("task_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  // Comments
  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, profiles:user_id(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Time logs
  const { data: timeLogs } = useQuery({
    queryKey: ["time-logs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("*, profiles:user_id(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Status history
  const { data: statusHistory } = useQuery({
    queryKey: ["status-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_status_history")
        .select("*, profiles:changed_by(full_name)")
        .eq("task_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Materials
  const { data: materials } = useQuery({
    queryKey: ["materials", id],
    queryFn: async () => {
      const { data } = await supabase.from("task_materials").select("*").eq("task_id", id!).order("created_at");
      return data || [];
    },
    enabled: !!id,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`task-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks", filter: `task_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["subtasks", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["comments", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs", filter: `task_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["time-logs", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_status_history", filter: `task_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["status-history", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({ status: newStatus as any, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("task_status_history").insert({
      task_id: task.id, old_status: task.status, new_status: newStatus, changed_by: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ["task", id] });
    toast.success(`Status zmieniony na ${statusLabels[newStatus]}`);
  }

  async function addComment() {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from("comments").insert({
      task_id: id!, user_id: user.id, content: commentText, type: commentType,
    });
    if (error) { toast.error(error.message); return; }
    setCommentText("");
    queryClient.invalidateQueries({ queryKey: ["comments", id] });
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return;
    const { error } = await supabase.from("subtasks").insert({ task_id: id!, title: newSubtask });
    if (error) { toast.error(error.message); return; }
    setNewSubtask("");
    queryClient.invalidateQueries({ queryKey: ["subtasks", id] });
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    await supabase.from("subtasks").update({ is_completed: !completed }).eq("id", subtaskId);
    queryClient.invalidateQueries({ queryKey: ["subtasks", id] });
  }

  async function stopTimer() {
    if (timerSeconds < 60 || !user) { setTimerRunning(false); setTimerSeconds(0); return; }
    const minutes = Math.round(timerSeconds / 60);
    await supabase.from("time_logs").insert({ task_id: id!, user_id: user.id, duration: minutes });
    setTimerRunning(false);
    setTimerSeconds(0);
    queryClient.invalidateQueries({ queryKey: ["time-logs", id] });
    toast.success(`Zalogowano ${minutes} min`);
  }

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  if (isLoading) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Ładowanie...</div></AppLayout>;
  if (!task) return <AppLayout title="Zadanie"><div className="p-8 text-muted-foreground">Nie znaleziono zadania.</div></AppLayout>;

  const totalLogged = timeLogs?.reduce((sum: number, l: any) => sum + l.duration, 0) || 0;
  const completedSubtasks = subtasks?.filter((s: any) => s.is_completed).length || 0;

  return (
    <AppLayout title={task.title}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/tasks" className="hover:text-foreground">Zadania</Link>
          <ChevronRight className="h-3 w-3" />
          {task.clients?.name && <><span>{task.clients.name}</span><ChevronRight className="h-3 w-3" /></>}
          {task.projects?.name && <><span>{task.projects.name}</span><ChevronRight className="h-3 w-3" /></>}
          <span className="text-foreground">{task.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Brief */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Brief zadania</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Cel zadania", field: "brief_goal" },
                  { label: "Co dostarczyć", field: "brief_deliverable" },
                  { label: "Format dostarczenia", field: "brief_format" },
                  { label: "Materiały wejściowe", field: "brief_input_materials" },
                  { label: "Czego NIE robić", field: "brief_dont_do" },
                  { label: "Wzorzec/inspiracja", field: "brief_inspiration" },
                ].map((item) => (
                  <div key={item.field}>
                    <Label className="text-xs text-muted-foreground">{item.label}</Label>
                    <p className="text-sm">{(task as any)[item.field] || <span className="text-muted-foreground italic">Nie uzupełniono</span>}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Subtasks */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Podzadania ({completedSubtasks}/{subtasks?.length || 0})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {subtasks?.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox checked={s.is_completed} onCheckedChange={() => toggleSubtask(s.id, s.is_completed)} />
                    <span className={`text-sm ${s.is_completed ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Nowe podzadanie..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubtask()} className="text-sm" />
                  <Button size="sm" variant="outline" onClick={addSubtask}><Plus className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs: Comments / History / Materials */}
            <Tabs defaultValue="comments">
              <TabsList>
                <TabsTrigger value="comments"><MessageCircle className="h-3 w-3 mr-1" />Komentarze</TabsTrigger>
                <TabsTrigger value="materials"><FileText className="h-3 w-3 mr-1" />Materiały</TabsTrigger>
                <TabsTrigger value="history"><History className="h-3 w-3 mr-1" />Historia</TabsTrigger>
                <TabsTrigger value="automation"><Zap className="h-3 w-3 mr-1" />Automatyzacje</TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="mt-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-2">
                      <Select value={commentType} onValueChange={setCommentType}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Wewnętrzny</SelectItem>
                          <SelectItem value="client">Klient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Napisz komentarz..."
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }} className="min-h-[60px]" />
                      <Button size="icon" onClick={addComment}><Send className="h-4 w-4" /></Button>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      {comments?.map((c: any) => (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 mt-0.5">
                            <AvatarFallback className="text-[10px] bg-muted">{c.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{c.profiles?.full_name}</span>
                              <Badge variant="outline" className="text-[10px] h-4">{c.type === "client" ? "Klient" : "Wewnętrzny"}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pl-PL")}</span>
                            </div>
                            <p className="text-sm mt-1">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {(!comments || comments.length === 0) && <p className="text-sm text-muted-foreground">Brak komentarzy.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="mt-4">
                <Card>
                  <CardContent className="pt-4">
                    {materials && materials.length > 0 ? (
                      <div className="space-y-2">
                        {materials.map((m: any) => (
                          <div key={m.id} className="flex items-center gap-2 p-2 rounded border">
                            {m.type === "link" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            <span className="text-sm flex-1">{m.name}</span>
                            {m.is_visible_to_client && <Badge variant="outline" className="text-[10px]">Widoczne dla klienta</Badge>}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Brak materiałów.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardContent className="pt-4">
                    {statusHistory && statusHistory.length > 0 ? (
                      <div className="space-y-2">
                        {statusHistory.map((h: any) => (
                          <div key={h.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{h.profiles?.full_name}</span>
                            <span className="text-muted-foreground">zmienił status z</span>
                            <Badge variant="secondary" className="text-xs">{statusLabels[h.old_status] || h.old_status || "—"}</Badge>
                            <span className="text-muted-foreground">na</span>
                            <Badge variant="secondary" className="text-xs">{statusLabels[h.new_status] || h.new_status}</Badge>
                            <span className="text-xs text-muted-foreground ml-auto">{new Date(h.created_at).toLocaleString("pl-PL")}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Brak historii statusów.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="automation" className="mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Brak wyników automatyzacji.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1 col */}
          <div className="space-y-4">
            {/* Status & Info */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ID zadania</Label>
                  <p className="text-sm font-mono">{task.id.slice(0, 8)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Priorytet</Label>
                  <Badge>{priorityLabels[task.priority] || task.priority}</Badge>
                </div>
                {task.type && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Typ</Label>
                    <p className="text-sm">{task.type}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Klient</Label>
                  <p className="text-sm">{task.clients?.name || "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Projekt</Label>
                  <p className="text-sm">{task.projects?.name || "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Termin</Label>
                  <p className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString("pl-PL") : "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Assigned people */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Przypisane osoby</CardTitle></CardHeader>
              <CardContent>
                {assignments && assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.map((a: any) => (
                      <div key={a.user_id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-muted">{a.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{a.profiles?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{a.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Brak przypisanych osób.</p>}
              </CardContent>
            </Card>

            {/* Time tracking */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Czas pracy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold">{formatTimer(timerSeconds)}</span>
                  <div className="flex gap-1">
                    {!timerRunning ? (
                      <Button size="sm" variant="outline" onClick={() => setTimerRunning(true)}><Play className="h-3 w-3" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={stopTimer}><Pause className="h-3 w-3" /></Button>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Szacowany</p>
                    <p className="font-medium">{task.estimated_time ? `${task.estimated_time} min` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Zalogowany</p>
                    <p className="font-medium">{totalLogged} min</p>
                  </div>
                </div>
                {timeLogs && timeLogs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      {timeLogs.slice(0, 5).map((l: any) => (
                        <div key={l.id} className="flex justify-between text-xs">
                          <span>{l.profiles?.full_name} — {l.duration} min</span>
                          <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pl-PL")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

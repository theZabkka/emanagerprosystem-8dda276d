import { useParams, useNavigate, Link } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ArrowLeft, ListChecks, Briefcase, FileText, Sparkles, CheckCircle2, Circle, Pencil, Save, X, Archive, Lock, Trash2, Plus, Search } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

const statusLabels: Record<string, string> = {
  active: "AKTYWNY", completed: "UKOŃCZONY", paused: "WSTRZYMANY", planning: "PLANOWANIE",
};
const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
  completed: "bg-muted text-muted-foreground border-border",
  paused: "bg-amber-500/15 text-amber-700 border-amber-400/40",
  planning: "bg-sky-500/15 text-sky-700 border-sky-400/40",
};

const priorityLabels: Record<string, string> = {
  critical: "KRYTYCZNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI",
};
const priorityColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-orange-500/15 text-orange-700 border-orange-400/40",
  medium: "bg-sky-500/15 text-sky-700 border-sky-400/40",
  low: "bg-muted text-muted-foreground border-border",
};

const taskStatusLabels: Record<string, string> = {
  new: "Nowe", todo: "Do zrobienia", in_progress: "W realizacji", review: "Review",
  corrections: "Poprawki", client_review: "U klienta", done: "Ukończone", cancelled: "Anulowane",
};

type BriefQuestion = { question: string; answer: string };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isClient } = useRole();
  const [activeTab, setActiveTab] = useState<"tasks" | "budget" | "brief">("tasks");
  const [editingBrief, setEditingBrief] = useState(false);
  const [editedBrief, setEditedBrief] = useState<BriefQuestion[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAssignExisting, setShowAssignExisting] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDeleteProject = async () => {
    if (!id) return;
    setIsDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Błąd usuwania: " + error.message);
      setIsDeleting(false);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast.success(`Pomyślnie usunięto projekt "${project?.name}"`);
    navigate("/projects");
  };

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name, avatar_url)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const isArchived = project?.is_archived === true;

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, task_assignments(user_id, role, profiles:user_id(full_name))")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      return (data || []).map((t: any) => {
        const primary = t.task_assignments?.find((a: any) => a.role === "primary");
        return { ...t, assignee_name: primary?.profiles?.full_name || null };
      });
    },
    enabled: !!id,
  });



  // Unassigned tasks for the same client (for "Assign existing" modal)
  const { data: unassignedTasks } = useQuery({
    queryKey: ["unassigned-tasks-for-project", project?.client_id],
    queryFn: async () => {
      let query = supabase.from("tasks").select("id, title, status, priority").is("project_id", null);
      if (project?.client_id) {
        query = query.eq("client_id", project.client_id);
      }
      const { data } = await query.eq("is_archived", false).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: showAssignExisting && !!project,
  });

  const assignTaskToProject = async (taskId: string) => {
    setAssigningTaskId(taskId);
    const { error } = await supabase.from("tasks").update({ project_id: id!, updated_at: new Date().toISOString() } as any).eq("id", taskId);
    setAssigningTaskId(null);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["unassigned-tasks-for-project"] });
    toast.success("Zadanie przypisane do projektu");
  };

  const teamMembers = (() => {
    if (!tasks) return [];
    const seen = new Set<string>();
    const members: { full_name: string }[] = [];
    tasks.forEach((t: any) => {
      t.task_assignments?.forEach((a: any) => {
        if (a.profiles?.full_name && !seen.has(a.user_id)) {
          seen.add(a.user_id);
          members.push(a.profiles);
        }
      });
    });
    return members;
  })();

  const totalTasks = tasks?.length || 0;
  const doneTasks = tasks?.filter((t: any) => t.status === "done").length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const briefData: BriefQuestion[] = project?.brief_data && Array.isArray(project.brief_data)
    ? (project.brief_data as any[])
    : [];
  const hasBrief = briefData.length > 0 && briefData.some((q: BriefQuestion) => q.answer?.trim());

  const startEdit = () => {
    if (isArchived) return;
    setEditedBrief(briefData.map(q => ({ ...q })));
    setEditingBrief(true);
  };

  const saveBrief = async () => {
    const { error } = await supabase.from("projects").update({ brief_data: editedBrief as any }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("Brief zapisany");
    setEditingBrief(false);
  };

  if (isLoading) {
    return (
      <AppLayout title="Projekt">
        <div className="flex items-center justify-center h-64 text-muted-foreground">Ładowanie...</div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Projekt">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Nie znaleziono projektu</p>
          <Button variant="outline" onClick={() => navigate(isClient ? "/dashboard" : "/projects")}>{isClient ? "Wróć do panelu klienta" : "Wróć do listy"}</Button>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { key: "tasks" as const, label: "Zadania", icon: ListChecks, count: totalTasks },
    ...(!isClient && !isArchived ? [{ key: "budget" as const, label: "Budżet", icon: Briefcase }] : []),
    { key: "brief" as const, label: "Brief", icon: FileText },
  ];

  return (
    <AppLayout title={project.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Archived banner */}
        {isArchived && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/50 border-border">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground">Projekt zarchiwizowany</p>
              <p className="text-xs text-muted-foreground">
                Tryb tylko do odczytu. Zarchiwizowano: {project.archived_at ? new Date(project.archived_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Header */}
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => navigate(isClient ? "/dashboard" : "/projects")}>
            <ArrowLeft className="h-4 w-4" /> {isClient ? "Wróć do dashboardu" : "Wróć do projektów"}
          </Button>

          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {isArchived && (
              <Badge variant="outline" className="text-xs font-bold uppercase bg-muted text-muted-foreground border-border">
                ARCHIWUM
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs font-bold uppercase ${statusColors[project.status || "active"]}`}>
              {statusLabels[project.status || "active"]}
            </Badge>
            <Badge variant="outline" className={`text-xs font-semibold ${hasBrief ? "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" : "bg-destructive/15 text-destructive border-destructive/40"}`}>
              Brief: {hasBrief ? "Wypełniony ✓" : "Brak ✗"}
            </Badge>
          </div>

          {!isClient && (
            <div className="flex items-center gap-2 mt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5">
                    <Trash2 className="h-4 w-4" /> Usuń projekt
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Trwałe usunięcie projektu</AlertDialogTitle>
                    <AlertDialogDescription>
                      Czy na pewno chcesz trwale usunąć projekt <strong>"{project.name}"</strong> wraz ze wszystkimi zadaniami? Tej operacji nie można cofnąć.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProject} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isDeleting ? "Usuwanie..." : "Tak, usuń"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {(project as any).clients?.name || "—"} · Kierownik: {(project as any).profiles?.full_name || "—"}
          </p>
        </div>

        {/* Progress & Team */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">{doneTasks}/{totalTasks} zadań ukończonych</span>
                <span className="font-bold text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3 [&>div]:bg-destructive" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start: {project.start_date ? new Date(project.start_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }) : "—"}</span>
                <span>Deadline: {project.end_date ? new Date(project.end_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" }) : "—"}</span>
              </div>
            </div>

            {teamMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Zespół:</span>
                <div className="flex -space-x-2">
                  {teamMembers.slice(0, 6).map((m: any, i: number) => {
                    const initials = m.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
                    return (
                      <Avatar key={i} className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {teamMembers.length > 6 && (
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">+{teamMembers.length - 6}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-destructive-foreground/20" : "bg-background"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content: Tasks */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {/* Task management buttons */}
            {!isClient && !isArchived && (
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => setShowCreateTask(true)}>
                  <Plus className="h-3.5 w-3.5" /> Utwórz nowe zadanie
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAssignExisting(true)}>
                  <Search className="h-3.5 w-3.5" /> Przypisz istniejące
                </Button>
              </div>
            )}
            <div className="space-y-2">
            {(() => {
              const displayTasks = isClient
                ? (tasks || []).filter((t: any) => t.status === "client_review")
                : tasks || [];
              if (displayTasks.length === 0) {
                return (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">
                    {isClient ? "Brak zadań oczekujących na Twoją akceptację" : "Brak zadań w tym projekcie"}
                  </CardContent></Card>
                );
              }

              // Archived: simple read-only list (no Kanban)
              if (isArchived) {
                return (
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Zadanie</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Osoba</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Priorytet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayTasks.map((task: any) => (
                            <tr key={task.id} className="border-b last:border-0">
                              <td className="px-4 py-2.5">
                                <span className={task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}>
                                  {task.title}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground">
                                {taskStatusLabels[task.status] || task.status}
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground">
                                {task.assignee_name || "—"}
                              </td>
                              <td className="px-4 py-2.5">
                                {task.priority && (
                                  <Badge variant="outline" className={`text-[10px] font-bold ${priorityColors[task.priority] || ""}`}>
                                    {priorityLabels[task.priority] || task.priority}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              }

              // Active: interactive task cards
              return displayTasks.map((task: any) => {
                const isDone = task.status === "done";
                return (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                    <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.assignee_name || "Nieprzypisane"} · {taskStatusLabels[task.status] || task.status}
                          </p>
                        </div>
                        {task.priority && (
                          <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${priorityColors[task.priority] || ""}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              });
            })()}
          </div>
        )}

        {/* Tab content: Budget */}
        {activeTab === "budget" && !isArchived && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budżet projektu</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Sekcja budżetu jest w przygotowaniu. Wkrótce pojawią się tu dane o kosztach, przychodach i rentowności projektu.</p>
            </CardContent>
          </Card>
        )}

        {/* Tab content: Brief */}
        {activeTab === "brief" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">BRIEF PROJEKTU</CardTitle>
                  <Badge variant="outline" className={`text-[10px] font-bold ${hasBrief ? "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" : "bg-destructive/15 text-destructive border-destructive/40"}`}>
                    {hasBrief ? "Wypełniony ✓" : "Brak"}
                  </Badge>
                </div>
                {!isClient && !editingBrief && !isArchived ? (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
                    <Pencil className="h-3 w-3" /> Edytuj
                  </Button>
                ) : editingBrief ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEditingBrief(false)}>
                      <X className="h-3 w-3" /> Anuluj
                    </Button>
                    <Button size="sm" className="gap-1 text-xs" onClick={saveBrief}>
                      <Save className="h-3 w-3" /> Zapisz
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {project.ai_summary && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-bold text-destructive uppercase">Podsumowanie AI</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{project.ai_summary}</p>
                  </div>
                )}

                {editingBrief ? (
                  <div className="space-y-4">
                    {editedBrief.map((q, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{q.question}</p>
                        <Textarea
                          value={q.answer}
                          onChange={e => {
                            const copy = [...editedBrief];
                            copy[i] = { ...copy[i], answer: e.target.value };
                            setEditedBrief(copy);
                          }}
                          className="text-sm min-h-[60px]"
                          placeholder="Wpisz odpowiedź..."
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {briefData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {isArchived ? "Brak pytań w briefie." : "Brak pytań w briefie. Kliknij \"Edytuj\" aby dodać."}
                      </p>
                    ) : (
                      briefData.map((q: BriefQuestion, i: number) => (
                        <div key={i} className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{q.question}</p>
                          <p className={`text-sm ${q.answer?.trim() ? "text-foreground" : "text-muted-foreground italic"}`}>
                            {q.answer?.trim() || "Brak odpowiedzi"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Task Dialog */}
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["project-tasks", id] })}
          defaultProjectId={id}
          defaultClientId={project?.client_id || undefined}
        />

        {/* Assign Existing Task Dialog */}
        <Dialog open={showAssignExisting} onOpenChange={setShowAssignExisting}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Przypisz istniejące zadanie</DialogTitle>
              <DialogDescription>
                Wyszukaj zadanie bez projektu {project?.client_id ? `dla klienta ${(project as any).clients?.name || ""}` : ""} i przypisz je do tego projektu.
              </DialogDescription>
            </DialogHeader>
            <Command className="border rounded-lg">
              <CommandInput placeholder="Szukaj zadania..." />
              <CommandList className="max-h-64">
                <CommandEmpty>Brak dostępnych zadań do przypisania</CommandEmpty>
                <CommandGroup>
                  {(unassignedTasks || []).map((t: any) => (
                    <CommandItem
                      key={t.id}
                      value={t.title}
                      onSelect={() => assignTaskToProject(t.id)}
                      disabled={assigningTaskId === t.id}
                      className="flex items-center gap-2"
                    >
                      <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm">{t.title}</span>
                      {t.priority && (
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${priorityColors[t.priority] || ""}`}>
                          {priorityLabels[t.priority] || t.priority}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

import { useParams, useNavigate, Link } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockProjects, mockClients, mockProfiles, mockTasks, mockTaskAssignments } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ListChecks, Briefcase, FileText, Sparkles, CheckCircle2, Circle, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const { isDemo } = useDataSource();
  const { isClient } = useRole();
  const [activeTab, setActiveTab] = useState<"tasks" | "budget" | "brief">("tasks");
  const [editingBrief, setEditingBrief] = useState(false);
  const [editedBrief, setEditedBrief] = useState<BriefQuestion[]>([]);

  // Fetch project
  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        const p = mockProjects.find(pr => pr.id === id);
        if (!p) return null;
        return {
          ...p,
          clients: mockClients.find(c => c.id === p.client_id) || null,
          profiles: mockProfiles.find(u => u.id === p.manager_id) || null,
          brief_data: (p as any).brief_data || [],
          ai_summary: (p as any).ai_summary || null,
        };
      }
      const { data } = await supabase
        .from("projects")
        .select("*, clients(name), profiles:manager_id(full_name, avatar_url)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch tasks for this project
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return mockTasks
          .filter(t => t.project_id === id)
          .map(t => {
            const assignment = mockTaskAssignments.find(a => a.task_id === t.id && a.role === "primary");
            const assignee = assignment ? mockProfiles.find(p => p.id === assignment.user_id) : null;
            return { ...t, assignee_name: assignee?.full_name || null };
          });
      }
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

  // Team members for this project
  const teamMembers = (() => {
    if (!tasks) return [];
    if (isDemo) {
      const userIds = new Set<string>();
      mockTaskAssignments
        .filter(a => tasks.some((t: any) => t.id === a.task_id))
        .forEach(a => userIds.add(a.user_id));
      const proj = mockProjects.find(p => p.id === id);
      if (proj?.manager_id) userIds.add(proj.manager_id);
      return Array.from(userIds).map(uid => mockProfiles.find(p => p.id === uid)).filter(Boolean);
    }
    // For Supabase, dedupe from task assignments
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
    setEditedBrief(briefData.map(q => ({ ...q })));
    setEditingBrief(true);
  };

  const saveBrief = async () => {
    if (isDemo) {
      toast.info("W trybie demo nie można zapisywać briefu");
      setEditingBrief(false);
      return;
    }
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
          <Button variant="outline" onClick={() => navigate("/projects")}>Wróć do listy</Button>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { key: "tasks" as const, label: "Zadania", icon: ListChecks, count: totalTasks },
    ...(!isClient ? [{ key: "budget" as const, label: "Budżet", icon: Briefcase }] : []),
    { key: "brief" as const, label: "Brief", icon: FileText },
  ];

  return (
    <AppLayout title={project.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" /> Wróć do projektów
          </Button>

          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge variant="outline" className={`text-xs font-bold uppercase ${statusColors[project.status || "active"]}`}>
              {statusLabels[project.status || "active"]}
            </Badge>
            <Badge variant="outline" className={`text-xs font-semibold ${hasBrief ? "bg-emerald-500/15 text-emerald-700 border-emerald-400/40" : "bg-destructive/15 text-destructive border-destructive/40"}`}>
              Brief: {hasBrief ? "Wypełniony ✓" : "Brak ✗"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {(project as any).clients?.name || "—"} · Kierownik: {(project as any).profiles?.full_name || "—"}
          </p>
        </div>

        {/* Progress & Team */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            {/* Progress bar */}
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

            {/* Team */}
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

        {/* Tab content */}
        {activeTab === "tasks" && (
          <div className="space-y-2">
            {!tasks || tasks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Brak zadań w tym projekcie</CardContent></Card>
            ) : (
              tasks.map((task: any) => {
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
              })
            )}
          </div>
        )}

        {activeTab === "budget" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budżet projektu</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Sekcja budżetu jest w przygotowaniu. Wkrótce pojawią się tu dane o kosztach, przychodach i rentowności projektu.</p>
            </CardContent>
          </Card>
        )}

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
                {!editingBrief ? (
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
                    <Pencil className="h-3 w-3" /> Edytuj
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEditingBrief(false)}>
                      <X className="h-3 w-3" /> Anuluj
                    </Button>
                    <Button size="sm" className="gap-1 text-xs" onClick={saveBrief}>
                      <Save className="h-3 w-3" /> Zapisz
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Summary */}
                {project.ai_summary && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-bold text-destructive uppercase">Podsumowanie AI</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{project.ai_summary}</p>
                  </div>
                )}

                {/* Q&A */}
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
                      <p className="text-sm text-muted-foreground">Brak pytań w briefie. Kliknij "Edytuj" aby dodać.</p>
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
      </div>
    </AppLayout>
  );
}

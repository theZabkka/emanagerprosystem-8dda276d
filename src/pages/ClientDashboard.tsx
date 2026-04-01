import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, ArrowRight, CheckCircle2, Clock, ShieldCheck, AlertTriangle, Archive, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ClientReviewModal } from "@/components/tasks/WorkflowModals";
import { toast } from "sonner";
import { statusLabels as allStatusLabels, statusColors as taskStatusColors } from "@/lib/statusConfig";

export default function ClientDashboard() {
  const { clientId, isPrimaryContact } = useRole();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, description, start_date, end_date")
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: taskSummary } = useQuery({
    queryKey: ["client-tasks-summary", clientId, isPrimaryContact, user?.id],
    queryFn: async () => {
      if (!clientId) return { review: 0, done: 0, total: 0 };
      const { data } = await supabase
        .from("tasks")
        .select("status, task_assignments(user_id)")
        .eq("client_id", clientId)
        .eq("is_archived", false);
      let filtered = data || [];
      if (!isPrimaryContact && user?.id) {
        filtered = filtered.filter((t: any) =>
          (t.task_assignments || []).some((a: any) => a.user_id === user.id)
        );
      }
      const review = filtered.filter(t => t.status === "client_review").length;
      const done = filtered.filter(t => t.status === "done" || t.status === "client_verified" || t.status === "closed").length;
      return { review, done, total: filtered.length };
    },
    enabled: !!clientId,
  });

  // Fetch ALL client tasks (no status filter) — client sees everything
  const { data: allClientTasks } = useQuery({
    queryKey: ["client-all-tasks", clientId, isPrimaryContact, user?.id],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, description, due_date, type, status, updated_at, projects(name), project_id, task_assignments(user_id)")
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (!data) return [];
      // Non-primary contacts only see tasks they're assigned to
      if (!isPrimaryContact && user?.id) {
        return data.filter((t: any) =>
          (t.task_assignments || []).some((a: any) => a.user_id === user.id)
        );
      }
      return data;
    },
    enabled: !!clientId,
  });

  // Split tasks by category
  const reviewTasks = allClientTasks?.filter((t: any) => t.status === "client_review") || [];
  const activeTasks = allClientTasks?.filter((t: any) => 
    !["client_review", "done", "client_verified", "closed", "cancelled"].includes(t.status)
  ) || [];
  const orphanedTasks = allClientTasks?.filter((t: any) => !t.project_id && t.status !== "client_review" && !["done", "client_verified", "closed", "cancelled"].includes(t.status)) || [];
  const archivedTasks = allClientTasks?.filter((t: any) => ["done", "client_verified", "closed"].includes(t.status)) || [];

  async function handleApprove() {
    if (!selectedTaskId) return;
    const { error } = await supabase.from("tasks").update({
      status: "client_verified" as any,
      updated_at: new Date().toISOString(),
      client_review_accepted_by: user?.id || profile?.full_name,
    } as any).eq("id", selectedTaskId);
    if (error) { toast.error("Błąd akceptacji"); return; }
    await supabase.from("task_status_history").insert({
      task_id: selectedTaskId,
      old_status: "client_review",
      new_status: "client_verified",
      changed_by: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ["client-all-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["client-tasks-summary"] });
    toast.success("Zadanie zaakceptowane!");
    setSelectedTaskId(null);
  }

  async function handleReject(severity: string, reason: string) {
    if (!selectedTaskId) return;
    const { error } = await supabase.from("tasks").update({
      status: "corrections" as any,
      updated_at: new Date().toISOString(),
      correction_severity: severity,
      bug_reason: reason,
    } as any).eq("id", selectedTaskId);
    if (error) { toast.error("Błąd zgłaszania poprawek"); return; }
    await supabase.from("task_status_history").insert({
      task_id: selectedTaskId,
      old_status: "client_review",
      new_status: "corrections",
      changed_by: user?.id,
    });
    if (user?.id) {
      await supabase.from("comments").insert({
        task_id: selectedTaskId,
        user_id: user.id,
        content: `📋 Uwagi klienta (${severity === "critical" ? "krytyczne" : "małe poprawki"}): ${reason}`,
        type: "client",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["client-all-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["client-tasks-summary"] });
    toast.success("Poprawki zgłoszone");
    setSelectedTaskId(null);
  }

  const projectStatusColors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 border-emerald-400/50",
    completed: "bg-blue-500/15 text-blue-700 border-blue-400/50",
    paused: "bg-amber-500/15 text-amber-700 border-amber-400/50",
  };

  const projectStatusLabels: Record<string, string> = {
    active: "Aktywny",
    completed: "Zakończony",
    paused: "Wstrzymany",
  };

  return (
    <AppLayout title="Mój Dashboard">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Witaj, {profile?.full_name?.split(" ")[0] || "Kliencie"} 👋
          </h2>
          <p className="text-muted-foreground mt-1">
            Oto przegląd Twoich projektów i zadań.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Projektów</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskSummary?.review || 0}</p>
                <p className="text-sm text-muted-foreground">Do akceptacji</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskSummary?.done || 0}</p>
                <p className="text-sm text-muted-foreground">Zakończonych</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks awaiting review — GUARD: only client_review tasks get action buttons */}
        {reviewTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Zadania do akceptacji ({reviewTasks.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {reviewTasks.map((task: any) => (
                <Card key={task.id} className="border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{task.title}</p>
                        {task.projects?.name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.projects.name}</p>
                        )}
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(`/tasks/${task.id}`)}>
                          <FileText className="h-3 w-3" /> Szczegóły
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                          onClick={() => { setSelectedTaskId(task.id); setReviewModalOpen(true); }}>
                          <ShieldCheck className="h-3 w-3" /> Sprawdź
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active tasks (visible but NO action buttons — read only) */}
        {activeTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Zadania w toku ({activeTasks.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {activeTasks.map((task: any) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{task.title}</p>
                        {task.projects?.name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.projects.name}</p>
                        )}
                        {!task.project_id && <Badge variant="outline" className="text-[10px] mt-1">Zadanie ogólne</Badge>}
                      </div>
                      <Badge className={`text-[9px] shrink-0 ${taskStatusColors[task.status] || "bg-muted"}`}>
                        {allStatusLabels[task.status] || task.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Projects list */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Twoje projekty</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="outline" className={projectStatusColors[project.status || "active"] || ""}>
                        {projectStatusLabels[project.status || "active"] || project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-0 text-primary">
                      Zobacz szczegóły <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nie masz jeszcze przypisanych projektów.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Archived tasks */}
        {archivedTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archiwum zakończonych zadań ({archivedTasks.length})
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {archivedTasks.map((task: any) => (
                <Card key={task.id} className="opacity-75 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{(task.projects as any)?.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {task.status === "client_verified" ? "Zaakceptowane" : task.status === "closed" ? "Zamknięte" : "Gotowe"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <ClientReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </AppLayout>
  );
}

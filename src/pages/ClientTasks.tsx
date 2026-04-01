import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderKanban, FileText, Filter, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Navigate } from "react-router-dom";
import { statusLabels, statusColors } from "@/lib/statusConfig";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type StatusFilter = "all" | "active" | "review" | "done";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "active", label: "W realizacji" },
  { value: "review", label: "Do akceptacji" },
  { value: "done", label: "Zakończone" },
];

const ACTIVE_STATUSES = ["new", "todo", "in_progress", "corrections", "waiting_for_client"];
const REVIEW_STATUSES = ["review", "client_review"];
const DONE_STATUSES = ["done", "client_verified", "closed"];

export default function ClientTasks() {
  const { clientId, hasContactPermission, isPrimaryContact } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const hasPermission = hasContactPermission("projects");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["client-projects-list", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("name");
      return data || [];
    },
    enabled: !!clientId && hasPermission,
  });

  // Fetch tasks — non-primary contacts only see tasks assigned to them
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["client-tasks-full", clientId, isPrimaryContact, user?.id],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("tasks")
        .select(`
          id, title, status, updated_at, due_date, project_id,
          projects(name),
          task_assignments(user_id, role, profiles:user_id(full_name, avatar_url))
        `)
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (!data) return [];
      // For non-primary contacts, filter to only tasks they're assigned to
      if (!isPrimaryContact && user?.id) {
        return data.filter((t: any) =>
          (t.task_assignments || []).some((a: any) => a.user_id === user.id)
        );
      }
      return data;
    },
    enabled: !!clientId && hasPermission,
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t: any) => {
      if (statusFilter === "active") return ACTIVE_STATUSES.includes(t.status);
      if (statusFilter === "review") return REVIEW_STATUSES.includes(t.status);
      if (statusFilter === "done") return DONE_STATUSES.includes(t.status);
      return true;
    });
  }, [tasks, statusFilter]);

  // Group tasks by project
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { projectName: string; tasks: any[] }> = {};
    const orphaned: any[] = [];

    for (const task of filteredTasks) {
      if (task.project_id) {
        if (!groups[task.project_id]) {
          groups[task.project_id] = {
            projectName: (task.projects as any)?.name || "Projekt",
            tasks: [],
          };
        }
        groups[task.project_id].tasks.push(task);
      } else {
        orphaned.push(task);
      }
    }

    return { groups, orphaned };
  }, [filteredTasks]);

  const isLoading = projectsLoading || tasksLoading;

  const getPrimaryAssignee = (task: any) => {
    const assignments = task.task_assignments || [];
    const primary = assignments.find((a: any) => a.role === "primary");
    return primary?.profiles?.full_name || null;
  };

  // Permission guard — all hooks called above
  if (!hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout title="Moje Zadania">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header with filter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Moje Zadania</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Przegląd wszystkich zadań Twojej firmy pogrupowanych według projektów.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats summary */}
        {tasks && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Wszystkich</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {tasks.filter((t: any) => ACTIVE_STATUSES.includes(t.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">W realizacji</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-accent-foreground">
                  {tasks.filter((t: any) => REVIEW_STATUSES.includes(t.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">Do akceptacji</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-secondary-foreground">
                  {tasks.filter((t: any) => DONE_STATUSES.includes(t.status)).length}
                </p>
                <p className="text-xs text-muted-foreground">Zakończonych</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Brak zadań do wyświetlenia</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter !== "all"
                  ? "Zmień filtr, aby zobaczyć inne zadania."
                  : "Nie masz jeszcze przypisanych zadań."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="space-y-8">
              {/* Project-grouped tasks */}
              {Object.entries(groupedTasks.groups).map(([projectId, group]) => (
                <div key={projectId}>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">{group.projectName}</h3>
                    <Badge variant="outline" className="text-[10px]">{group.tasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {group.tasks.map((task: any) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        assignee={getPrimaryAssignee(task)}
                        onNavigate={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Orphaned tasks (no project) */}
              {groupedTasks.orphaned.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Zadania ogólne</h3>
                    <Badge variant="outline" className="text-[10px]">{groupedTasks.orphaned.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {groupedTasks.orphaned.map((task: any) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        assignee={getPrimaryAssignee(task)}
                        onNavigate={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </AppLayout>
  );
}

function TaskRow({ task, assignee, onNavigate }: { task: any; assignee: string | null; onNavigate: () => void }) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onNavigate}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
              {task.title}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {assignee && <span>👤 {assignee}</span>}
              {task.updated_at && (
                <span>
                  Aktualizacja: {format(new Date(task.updated_at), "d MMM yyyy", { locale: pl })}
                </span>
              )}
              {task.due_date && (
                <span className={new Date(task.due_date) < new Date() ? "text-destructive font-medium" : ""}>
                  Termin: {format(new Date(task.due_date), "d MMM", { locale: pl })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-[10px] ${statusColors[task.status] || "bg-muted"}`}>
              {statusLabels[task.status] || task.status}
            </Badge>
            {task.status === "client_review" && (
              <MessageSquare className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

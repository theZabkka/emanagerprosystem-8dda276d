import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";

export default function ClientTasks() {
  const { clientId, isClient, isPrimaryContact } = useRole();
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["client-kanban-tasks", clientId, isPrimaryContact, user?.id],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("tasks")
        .select(`
          id, title, status, priority, due_date, updated_at, created_at,
          client_id, project_id, is_archived, lexo_rank,
          is_misunderstood, not_understood, correction_severity, estimated_time, logged_time,
          task_assignments(user_id, role, profiles:user_id(full_name, avatar_url))
        `)
        .eq("client_id", clientId)
        .eq("is_archived", false)
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (!data) return [];
      // Non-primary contacts see only tasks assigned to them
      if (!isPrimaryContact && user?.id) {
        return data.filter((t: any) =>
          (t.task_assignments || []).some((a: any) => a.user_id === user.id)
        );
      }
      return data;
    },
    enabled: !!clientId,
  });

  // Extract assignments from tasks for the Kanban component
  const assignments = useMemo(() => {
    return tasks.flatMap((t: any) =>
      (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id }))
    );
  }, [tasks]);

  // Guard: only clients (hooks called above)
  if (!isClient) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <AppLayout title="Zadania">
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Zadania">
      <div className="px-2">
        <h2 className="text-xl font-bold text-foreground mb-4">Zadania</h2>
        <TaskKanbanBoard
          tasks={tasks}
          profiles={[]}
          assignments={assignments}
          clients={[]}
          onStatusChange={() => {}}
          isClientMode
        />
      </div>
    </AppLayout>
  );
}

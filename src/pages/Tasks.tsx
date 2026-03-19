import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockTasks, mockClients, mockProjects, mockTaskAssignments, mockProfiles } from "@/lib/mockData";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { TaskAlertBanners } from "@/components/tasks/TaskAlertBanners";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { KanbanSkeleton } from "@/components/skeletons/KanbanSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

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

  const filteredTasks = (tasks || []).filter((t: any) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === "parent") return !(t as any).parent_task_id && (tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    if (typeFilter === "subtask") return !!(t as any).parent_task_id;
    if (typeFilter === "standalone") return !(t as any).parent_task_id && !(tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    return true;
  });

  const allTasks = tasks || [];
  const unassignedCount = allTasks.filter((t: any) => {
    const hasAssignment = isDemo
      ? mockTaskAssignments.some(a => a.task_id === t.id && a.role === "primary")
      : t.task_assignments?.some((a: any) => a.role === "primary");
    return !hasAssignment && t.status !== "done" && t.status !== "cancelled" && t.status !== "closed";
  }).length;
  const reviewCount = allTasks.filter((t: any) => t.status === "review").length;
  const clientReviewCount = allTasks.filter((t: any) => t.status === "client_review").length;
  const notUnderstoodCount = allTasks.filter((t: any) => t.not_understood).length;

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (isDemo) {
      queryClient.setQueryData(["tasks", statusFilter, priorityFilter, isDemo], (old: any[]) =>
        old?.map(t => {
          if (t.id !== taskId) return t;
          const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
          if (newStatus === "review") updates.verification_start_time = new Date().toISOString();
          if (newStatus !== "review") updates.verification_start_time = null;
          return { ...t, ...updates };
        })
      );
      toast.success("Status zaktualizowany (demo)");
      return;
    }

    const updates: any = { status: newStatus as any, updated_at: new Date().toISOString() };
    // Set verification_start_time when entering review
    if (newStatus === "review") {
      updates.verification_start_time = new Date().toISOString();
    }
    // Clear when leaving review
    if (newStatus !== "review") {
      updates.verification_start_time = null;
    }

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) { toast.error("Błąd aktualizacji statusu"); return; }
    toast.success("Status zaktualizowany");
    refetch();
  }

  return (
    <AppLayout title="Zadania">
      <div className="space-y-4 mx-auto">
        <TaskAlertBanners
          unassignedCount={unassignedCount}
          reviewCount={reviewCount}
          clientReviewCount={clientReviewCount}
          notUnderstoodCount={notUnderstoodCount}
          onFilterStatus={setStatusFilter}
        />

        <TaskFilters
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter}
          typeFilter={typeFilter} onTypeChange={setTypeFilter}
          viewMode={viewMode} onViewModeChange={setViewMode}
          onCreateClick={() => setIsCreateOpen(true)}
        />

        <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => refetch()} />

        {isLoading ? (
          viewMode === "kanban" ? <KanbanSkeleton /> : <TableSkeleton columns={5} rows={8} />
        ) : viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            profiles={isDemo ? mockProfiles : []}
            assignments={isDemo ? mockTaskAssignments : filteredTasks.flatMap((t: any) => (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id })))}
            clients={isDemo ? mockClients : filteredTasks.map((t: any) => t.clients ? { id: t.client_id, name: t.clients.name } : null).filter(Boolean)}
            onStatusChange={handleStatusChange}
            onRefresh={() => refetch()}
          />
        ) : (
          <TaskListView tasks={filteredTasks} isLoading={isLoading} />
        )}
      </div>
    </AppLayout>
  );
}

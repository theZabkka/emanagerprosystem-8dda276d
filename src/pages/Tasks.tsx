import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { TaskAlertBanners } from "@/components/tasks/TaskAlertBanners";
import { TaskFilters, type SortField, type SortDirection } from "@/components/tasks/TaskFilters";
import { KanbanSkeleton } from "@/components/skeletons/KanbanSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);

  // Read URL params on mount
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    const urlFilter = searchParams.get("filter");
    const urlTaskId = searchParams.get("taskId");
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlFilter === "overdue") setOverdueFilter(true);
    if (urlTaskId) {
      setAutoOpenTaskId(urlTaskId);
      // Navigate to task detail
      navigate(`/tasks/${urlTaskId}`, { replace: true });
    }
    // Clear params after reading
    if (urlStatus || urlFilter || urlTaskId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("status");
      newParams.delete("filter");
      newParams.delete("taskId");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["tasks", priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, clients(name, has_retainer), projects(name), task_assignments(user_id, role, profiles:user_id(full_name))")
        .eq("is_archived", false)
        .order("lexo_rank" as any, { ascending: true });
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const filteredTasks = (tasks || []).filter((t: any) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (overdueFilter && (!t.due_date || t.due_date >= today)) return false;
    if (typeFilter === "parent") return !(t as any).parent_task_id && (tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    if (typeFilter === "subtask") return !!(t as any).parent_task_id;
    if (typeFilter === "standalone") return !(t as any).parent_task_id && !(tasks || []).some((mt: any) => mt.parent_task_id === t.id);
    return true;
  });

  const allTasks = tasks || [];
  const unassignedCount = allTasks.filter((t: any) => {
    const hasAssignment = t.task_assignments?.some((a: any) => a.role === "primary");
    return !hasAssignment && t.status !== "done" && t.status !== "cancelled" && t.status !== "closed";
  }).length;
  const reviewCount = allTasks.filter((t: any) => t.status === "review").length;
  const clientReviewCount = allTasks.filter((t: any) => t.status === "client_review").length;
  const notUnderstoodCount = allTasks.filter((t: any) => t.not_understood).length;
  const misunderstoodTasks = allTasks
    .filter((t: any) => t.not_understood)
    .map((t: any) => ({ id: t.id, not_understood_at: t.not_understood_at }));

  const handleFilterStatus = (status: string) => {
    setStatusFilter(status);
    setOverdueFilter(false);
  };

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    const queryKey = ["tasks", priorityFilter];
    const previousTasks = queryClient.getQueryData<any[]>(queryKey);

    queryClient.setQueryData<any[]>(queryKey, (old) =>
      (old || []).map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, status_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : t
      )
    );

    const { error } = await supabase.rpc("change_task_status", {
      _task_id: taskId,
      _new_status: newStatus as any,
      _changed_by: user?.id!,
    });

    if (error) {
      queryClient.setQueryData(queryKey, previousTasks);
      toast.error("Nie udało się zapisać zmiany statusu.");
      return;
    }

    toast.success("Status zaktualizowany");
    queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    refetch();
  }, [priorityFilter, queryClient, user?.id, refetch]);

  const handleLexoRankUpdate = useCallback(async (taskId: string, newRank: string) => {
    const queryKey = ["tasks", priorityFilter];
    const previousTasks = queryClient.getQueryData<any[]>(queryKey);

    // Optimistic update
    queryClient.setQueryData<any[]>(queryKey, (old) =>
      (old || []).map((t) =>
        t.id === taskId ? { ...t, lexo_rank: newRank } : t
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ lexo_rank: newRank } as any)
      .eq("id", taskId);

    if (error) {
      queryClient.setQueryData(queryKey, previousTasks);
      toast.error("Nie udało się zapisać kolejności.");
    }
  }, [priorityFilter, queryClient]);

  async function handleArchive(taskId: string) {
    const { error } = await supabase.from("tasks").update({ is_archived: true, updated_at: new Date().toISOString() } as any).eq("id", taskId);
    if (error) { toast.error("Błąd archiwizacji"); return; }
    toast.success("Zadanie zarchiwizowane");
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
          misunderstoodTasks={misunderstoodTasks}
          onFilterStatus={handleFilterStatus}
        />

        <TaskFilters
          search={search} onSearchChange={setSearch}
          priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter}
          typeFilter={typeFilter} onTypeChange={setTypeFilter}
          viewMode={viewMode} onViewModeChange={setViewMode}
          onCreateClick={() => setIsCreateOpen(true)}
          sortField={sortField} onSortFieldChange={setSortField}
          sortDirection={sortDirection} onSortDirectionToggle={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
        />

        <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => refetch()} />

        {isLoading ? (
          viewMode === "kanban" ? <KanbanSkeleton /> : <TableSkeleton columns={5} rows={8} />
        ) : viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            profiles={[]}
            assignments={filteredTasks.flatMap((t: any) => (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id })))}
            clients={filteredTasks.map((t: any) => t.clients ? { id: t.client_id, name: t.clients.name, has_retainer: t.clients.has_retainer } : null).filter(Boolean)}
            onStatusChange={handleStatusChange}
            onArchive={handleArchive}
            onRefresh={() => refetch()}
            onLexoRankUpdate={handleLexoRankUpdate}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        ) : (
          <TaskListView tasks={filteredTasks} isLoading={isLoading} />
        )}
      </div>
    </AppLayout>
  );
}

import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import TaskTeamBoard from "@/components/tasks/TaskTeamBoard";
import TaskListView from "@/components/tasks/TaskListView";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { TaskAlertBanners } from "@/components/tasks/TaskAlertBanners";
import { TaskFiltersTopbar } from "@/components/tasks/TaskFiltersTopbar";
import { TaskFilterSidebar, type SidebarFilters } from "@/components/tasks/TaskFilterSidebar";
import type { SortField, SortDirection, KanbanMode } from "@/components/tasks/TaskFilters";
import { KanbanSkeleton } from "@/components/skeletons/KanbanSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { FileX2 } from "lucide-react";
import type { TaskWithRelations, TaskStatus } from "@/types/models";

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: staffProfiles = [] } = useStaffMembers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [kanbanMode, setKanbanMode] = useState<KanbanMode>("status");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [quickAddStatus, setQuickAddStatus] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [unassignedFilter, setUnassignedFilter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarFilters, setSidebarFilters] = useState<SidebarFilters>({
    clientIds: [],
    projectIds: [],
    assigneeIds: [],
    priorities: [],
    types: [],
    sortField: "due_date",
    sortDirection: "asc",
  });

  const isTerminalStatus = (status?: string | null) => ["done", "cancelled", "closed"].includes(status || "");
  const hasNonEmptyTitle = (task: TaskWithRelations) => typeof task.title === "string" && task.title.trim().length > 0;
  const isTaskUnassigned = (task: TaskWithRelations) => (task.task_assignments || []).length === 0;
  const isUnassignedAlertCandidate = (task: TaskWithRelations) =>
    !isTerminalStatus(task.status) && hasNonEmptyTitle(task) && isTaskUnassigned(task);

  // Read URL params on mount
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    const urlFilter = searchParams.get("filter");
    const urlTaskId = searchParams.get("taskId");
    const urlUnassigned = searchParams.get("unassigned");

    if (urlUnassigned === "true") {
      setSearch("");
      setStatusFilter("all");
      setOverdueFilter(false);
      setUnassignedFilter(true);
    } else {
      if (urlStatus) setStatusFilter(urlStatus);
      if (urlFilter === "overdue") setOverdueFilter(true);
    }

    if (urlTaskId) {
      navigate(`/tasks/${urlTaskId}`, { replace: true });
    }

    if (urlStatus || urlFilter || urlTaskId || urlUnassigned) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("status");
      newParams.delete("filter");
      newParams.delete("taskId");
      newParams.delete("unassigned");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  const SELECT_FIELDS =
    "id, title, status, priority, due_date, lexo_rank, client_id, project_id, type, " +
    "parent_task_id, not_understood, not_understood_at, is_misunderstood, correction_severity, " +
    "is_archived, estimated_time, logged_time, updated_at, created_at, status_updated_at, " +
    "clients(name, has_retainer), projects(name), task_assignments(user_id, role, profiles:user_id(full_name))";

  const KANBAN_STATUSES = ["new","todo","in_progress","waiting_for_client","review","corrections","client_review","client_verified","done","cancelled"] as const;
  const PER_STATUS_LIMIT = 300;

  const applyServerFilters = (q: any) => {
    if (sidebarFilters.clientIds.length > 0) q = q.in("client_id", sidebarFilters.clientIds);
    if (sidebarFilters.projectIds.length > 0) q = q.in("project_id", sidebarFilters.projectIds);
    if (sidebarFilters.priorities.length > 0) q = q.in("priority", sidebarFilters.priorities as ("critical" | "high" | "medium" | "low")[]);
    return q;
  };

  // Kanban: per-status queries with 300 limit each
  const {
    data: kanbanData,
    isLoading: kanbanLoading,
    refetch: kanbanRefetch,
  } = useQuery<{ tasks: TaskWithRelations[]; truncatedColumns: string[] }>({
    queryKey: ["tasks-kanban", sidebarFilters.clientIds, sidebarFilters.projectIds, sidebarFilters.assigneeIds, sidebarFilters.priorities],
    queryFn: async () => {
      const results = await Promise.all(
        KANBAN_STATUSES.map((status) => {
          let q = supabase
            .from("tasks")
            .select(SELECT_FIELDS)
            .eq("is_archived", false)
            .eq("status", status)
            .order("lexo_rank", { ascending: true })
            .limit(PER_STATUS_LIMIT);
          q = applyServerFilters(q);
          return q;
        }),
      );
      const tasks = results.flatMap((r) => (r.data ?? []));
      const truncatedColumns = KANBAN_STATUSES.filter((_, i) => (results[i].data?.length ?? 0) >= PER_STATUS_LIMIT);
      return { tasks: tasks as unknown as TaskWithRelations[], truncatedColumns: [...truncatedColumns] };
    },
    staleTime: 2 * 60 * 1000,
    enabled: viewMode === "kanban",
  });

  // List: infinite query with pagination
  const PAGE_SIZE = 50;
  const {
    data: listData,
    isLoading: listLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: listRefetch,
  } = useInfiniteQuery<TaskWithRelations[]>({
    queryKey: ["tasks-list", sidebarFilters.clientIds, sidebarFilters.projectIds, sidebarFilters.assigneeIds, sidebarFilters.priorities],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("tasks")
        .select(SELECT_FIELDS)
        .eq("is_archived", false)
        .order("lexo_rank", { ascending: true })
        .range(from, to);
      q = applyServerFilters(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TaskWithRelations[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    enabled: viewMode === "list",
  });

  const tasks = viewMode === "kanban" ? (kanbanData?.tasks ?? []) : (listData?.pages.flat() ?? []);
  const truncatedColumns = kanbanData?.truncatedColumns ?? [];
  const isLoading = viewMode === "kanban" ? kanbanLoading : listLoading;
  const refetch = viewMode === "kanban" ? kanbanRefetch : listRefetch;

  const today = new Date().toISOString().split("T")[0];

  // Client-side filters for things that can't easily be done server-side
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      const title = typeof t.title === "string" ? t.title : "";
      const matchesSearch =
        title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (overdueFilter && (!t.due_date || t.due_date >= today)) return false;
      if (unassignedFilter && !isUnassignedAlertCandidate(t)) return false;

      // Assignee filter (needs client-side because it's through task_assignments join)
      if (sidebarFilters.assigneeIds.length > 0) {
        const assigned = (t.task_assignments || []).some((a) => sidebarFilters.assigneeIds.includes(a.user_id));
        if (!assigned) return false;
      }

      // Type filter
      if (sidebarFilters.types.length > 0) {
        const allTasks = tasks || [];
        const isParent = !t.parent_task_id && allTasks.some((mt) => mt.parent_task_id === t.id);
        const isSubtask = !!t.parent_task_id;
        const isStandalone = !t.parent_task_id && !allTasks.some((mt) => mt.parent_task_id === t.id);
        const matchesType = sidebarFilters.types.some((type) => {
          if (type === "parent") return isParent;
          if (type === "subtask") return isSubtask;
          if (type === "standalone") return isStandalone;
          return false;
        });
        if (!matchesType) return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, overdueFilter, unassignedFilter, sidebarFilters.assigneeIds, sidebarFilters.types, today]);

  // Task counts by client for sidebar badges
  const taskCountsByClient = useMemo(() => {
    const counts: Record<string, number> = {};
    (tasks || []).forEach((t) => {
      if (t.client_id) counts[t.client_id] = (counts[t.client_id] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const activeFilterCount = sidebarFilters.clientIds.length + sidebarFilters.projectIds.length + sidebarFilters.assigneeIds.length + sidebarFilters.priorities.length + sidebarFilters.types.length;

  const allTasks = tasks || [];
  const unassignedCount = allTasks.filter((t) => isUnassignedAlertCandidate(t)).length;
  const reviewCount = allTasks.filter((t) => t.status === "review").length;
  const clientReviewCount = allTasks.filter((t) => t.status === "client_review").length;
  const notUnderstoodCount = allTasks.filter((t) => t.not_understood).length;
  const misunderstoodTasks = allTasks
    .filter((t) => t.not_understood)
    .map((t) => ({ id: t.id, not_understood_at: t.not_understood_at }));

  const handleFilterStatus = (status: string) => {
    setStatusFilter((prev) => (prev === status ? "all" : status));
    setOverdueFilter(false);
    setUnassignedFilter(false);
  };

  const handleFilterUnassigned = () => {
    if (unassignedFilter) {
      setUnassignedFilter(false);
      return;
    }
    setSearch("");
    setStatusFilter("all");
    setOverdueFilter(false);
    setUnassignedFilter(true);
  };

  const handlePersonDrillDown = useCallback((userId: string) => {
    setSidebarFilters((prev) => ({
      ...prev,
      assigneeIds: [userId],
    }));
    setKanbanMode("status");
  }, []);

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      const queryKey = ["tasks-kanban", sidebarFilters.clientIds, sidebarFilters.projectIds, sidebarFilters.assigneeIds, sidebarFilters.priorities];
      const previousData = queryClient.getQueryData<{ tasks: TaskWithRelations[]; truncatedColumns: string[] }>(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: (old.tasks || []).map((t: TaskWithRelations) =>
            t.id === taskId
              ? { ...t, status: newStatus as TaskStatus, status_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              : t,
          ),
        };
      });

      const { error } = await supabase.rpc("change_task_status", {
        _task_id: taskId,
        _new_status: newStatus as TaskStatus,
        _changed_by: user?.id!,
      });

      if (error) {
        queryClient.setQueryData(queryKey, previousData);
        toast.error("Nie udało się zapisać zmiany statusu.");
        return;
      }

      toast.success("Status zaktualizowany");
      queryClient.invalidateQueries({ queryKey, refetchType: "none" });
      refetch();
    },
    [sidebarFilters, queryClient, user?.id, refetch],
  );

  const handleLexoRankUpdate = useCallback(
    async (taskId: string, newRank: string) => {
      const queryKey = ["tasks-kanban", sidebarFilters.clientIds, sidebarFilters.projectIds, sidebarFilters.assigneeIds, sidebarFilters.priorities];
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, tasks: (old.tasks || []).map((t: TaskWithRelations) => (t.id === taskId ? { ...t, lexo_rank: newRank } : t)) };
      });

      const { error } = await supabase
        .from("tasks")
        .update({ lexo_rank: newRank })
        .eq("id", taskId);

      if (error) {
        queryClient.setQueryData(queryKey, previousData);
        toast.error("Nie udało się zapisać kolejności.");
      }
    },
    [sidebarFilters, queryClient],
  );

  const handleArchive = useCallback(
    async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) {
        toast.error("Błąd archiwizacji");
        return;
      }
      toast.success("Zadanie zarchiwizowane");
      refetch();
    },
    [refetch],
  );

  const emptyState = !isLoading && filteredTasks.length === 0 && (search || activeFilterCount > 0 || statusFilter !== "all" || unassignedFilter || overdueFilter);

  return (
    <AppLayout title="Zadania">
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">
        {/* Banners above everything */}
        <div className="shrink-0 px-6 pt-4 pb-2 bg-background">
          <TaskAlertBanners
            unassignedCount={unassignedCount}
            reviewCount={reviewCount}
            clientReviewCount={clientReviewCount}
            notUnderstoodCount={notUnderstoodCount}
            misunderstoodTasks={misunderstoodTasks}
            onFilterStatus={handleFilterStatus}
            onFilterUnassigned={handleFilterUnassigned}
          />
        </div>

        {/* Toolbar */}
        <div className="shrink-0 px-6 pb-2 bg-background">
          <TaskFiltersTopbar
            search={search}
            onSearchChange={setSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreateClick={() => setIsCreateOpen(true)}
            kanbanMode={kanbanMode}
            onKanbanModeChange={setKanbanMode}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <CreateTaskDialog
          open={isCreateOpen}
          onOpenChange={(v) => {
            setIsCreateOpen(v);
            if (!v) setQuickAddStatus(undefined);
          }}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
          defaultStatus={quickAddStatus}
        />

        {/* Sidebar + Board fill remaining height */}
        <div className="flex flex-1 min-h-0">
          <TaskFilterSidebar
            filters={sidebarFilters}
            onFiltersChange={setSidebarFilters}
            taskCountsByClient={taskCountsByClient}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />

          <div className="flex-1 min-w-0 overflow-auto">
            {emptyState ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileX2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-sm">Brak zadań spełniających wybrane kryteria.</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Spróbuj zmienić ustawienia filtrów.</p>
              </div>
            ) : isLoading ? (
              viewMode === "kanban" ? <KanbanSkeleton /> : <TableSkeleton columns={5} rows={8} />
            ) : viewMode === "kanban" ? (
              kanbanMode === "team" ? (
                <TaskTeamBoard
                  tasks={filteredTasks}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
                  priorityFilter={sidebarFilters.priorities.length === 1 ? sidebarFilters.priorities[0] : "all"}
                  onPersonClick={handlePersonDrillDown}
                />
              ) : (
                <TaskKanbanBoard
                  tasks={filteredTasks}
                  profiles={staffProfiles}
                  assignments={filteredTasks.flatMap((t: any) =>
                    (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id })),
                  )}
                  clients={filteredTasks
                    .map((t: any) =>
                      t.clients ? { id: t.client_id, name: t.clients.name, has_retainer: t.clients.has_retainer } : null,
                    )
                    .filter(Boolean)}
                  onStatusChange={handleStatusChange}
                  onArchive={handleArchive}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["tasks-kanban"] })}
                  onLexoRankUpdate={handleLexoRankUpdate}
                  truncatedColumns={truncatedColumns}
                  onQuickAdd={(status) => {
                    setQuickAddStatus(status);
                    setIsCreateOpen(true);
                  }}
                  sortField={sidebarFilters.sortField}
                  sortDirection={sidebarFilters.sortDirection}
                />
              )
            ) : (
              <TaskListView
                tasks={filteredTasks}
                isLoading={isLoading}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

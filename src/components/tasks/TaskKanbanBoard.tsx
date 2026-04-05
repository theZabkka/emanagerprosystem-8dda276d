import React, { useCallback, useEffect, useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChecklistBlockModal, ResponsibilityModal } from "./WorkflowModals";
import { RejectionModal } from "./RejectionModal";
import { DeleteTaskModal } from "./DeleteTaskModal";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { compareRanks, generateMidpointRank, generateRankAfter, generateRankBefore } from "@/lib/lexoRank";
import { sortTasks } from "@/lib/taskSorting";
import type { SortField, SortDirection } from "@/components/tasks/TaskFilters";
import { KanbanColumn } from "./KanbanColumn";

const KANBAN_COLUMNS = [
  { key: "new", label: "NOWE" },
  { key: "todo", label: "DO ZROBIENIA" },
  { key: "in_progress", label: "W REALIZACJI" },
  { key: "waiting_for_client", label: "OCZEKIWANIE NA KLIENTA" },
  { key: "review", label: "WERYFIKACJA" },
  { key: "corrections", label: "POPRAWKI" },
  { key: "client_review", label: "DO AKCEPTACJI KLIENTA" },
  { key: "client_verified", label: "ZWERYFIKOWANE" },
  { key: "done", label: "GOTOWE" },
  { key: "closed", label: "ZAMKNIĘTE" },
  { key: "cancelled", label: "ANULOWANE" },
] as const;

const CLIENT_KANBAN_COLUMNS = [
  { key: "todo", label: "DO ZROBIENIA" },
  { key: "in_progress", label: "W REALIZACJI" },
  { key: "waiting_for_client", label: "OCZEKIWANIE NA KLIENTA" },
  { key: "client_review", label: "DO AKCEPTACJI KLIENTA" },
  { key: "client_verified", label: "ZWERYFIKOWANE" },
  { key: "done", label: "GOTOWE" },
] as const;

const AVATAR_COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600"];

interface TaskKanbanBoardProps {
  tasks: any[];
  profiles: any[];
  assignments: any[];
  clients: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onArchive?: (taskId: string) => void;
  onRefresh?: () => void;
  onLexoRankUpdate?: (taskId: string, newRank: string) => void;
  onQuickAdd?: (status: string) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  isClientMode?: boolean;
  truncatedColumns?: string[];
}

export default function TaskKanbanBoard({
  tasks,
  profiles,
  assignments,
  clients,
  onStatusChange,
  onArchive,
  onRefresh,
  onLexoRankUpdate,
  onQuickAdd,
  sortField = "manual",
  sortDirection = "asc",
  isClientMode = false,
}: TaskKanbanBoardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { currentRole, roleLoading } = useRole();
  const { profile } = useAuth();
  const normalizedRole = (profile?.role ?? currentRole ?? "").toLowerCase().replace(/\s/g, "");
  const isSuperAdmin = !roleLoading && normalizedRole === "superadmin";
  const isBoss = !roleLoading && normalizedRole === "boss";
  const canDeleteTask = isSuperAdmin || isBoss;
  const isManualSort = sortField === "manual";
  const [checklistBlockOpen, setChecklistBlockOpen] = useState(false);
  const [responsibilityOpen, setResponsibilityOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; newStatus: string } | null>(null);
  const [pendingRejectionTaskId, setPendingRejectionTaskId] = useState<string | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<any[]>(tasks);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  const { data: allChecklists } = useQuery({
    queryKey: [
      "kanban-checklists",
      tasks
        .map((t) => t.id)
        .sort()
        .join(","),
    ],
    queryFn: async () => {
      if (tasks.length === 0) return [];
      const taskIds = tasks.map((t) => t.id);
      const { data } = await supabase
        .from("checklists")
        .select("task_id, checklist_items(is_completed, is_na)")
        .in("task_id", taskIds);
      return data || [];
    },
    enabled: tasks.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const isChecklistComplete = useCallback(
    (taskId: string) => {
      if (!allChecklists) return true;
      const taskChecklists = allChecklists.filter((cl: any) => cl.task_id === taskId);
      if (taskChecklists.length === 0) return true;
      for (const cl of taskChecklists) {
        const items = (cl as any).checklist_items || [];
        if (items.length === 0) continue;
        const allDone = items.every((i: any) => i.is_completed || i.is_na);
        if (!allDone) return false;
      }
      return true;
    },
    [allChecklists],
  );

  const getAssignee = useCallback(
    (taskId: string) => {
      const a = assignments.find((a: any) => a.task_id === taskId && a.role === "primary");
      if (!a) return null;
      return (
        profiles.find((p: any) => p.id === a.user_id) ||
        (a.profiles ? { id: a.user_id, full_name: a.profiles.full_name } : null)
      );
    },
    [assignments, profiles],
  );

  const getAllAssignees = useCallback(
    (taskId: string) => {
      const taskAssigns = assignments.filter((a: any) => a.task_id === taskId);
      return taskAssigns
        .map((a: any) => {
          const profile =
            profiles.find((p: any) => p.id === a.user_id) ||
            (a.profiles ? { id: a.user_id, full_name: a.profiles.full_name } : null);
          return profile ? { ...profile, assignRole: a.role } : null;
        })
        .filter(Boolean);
    },
    [assignments, profiles],
  );

  const getClient = useCallback(
    (clientId: string | null) => {
      if (!clientId) return null;
      return clients.find((c: any) => c.id === clientId) || null;
    },
    [clients],
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getAvatarColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getWaitingTime = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `Czeka: ${days} dni ${hours} godz.`;
    if (hours > 0) return `Czeka: ${hours} godz.`;
    return null;
  };

  const getTaskAssignments = useCallback(
    (taskId: string) => {
      return assignments.filter((a: any) => a.task_id === taskId);
    },
    [assignments],
  );

  const handleRejectionConfirm = async (category: string, comment: string) => {
    if (!pendingRejectionTaskId || !user?.id) return;
    const task = optimisticTasks.find((t: any) => t.id === pendingRejectionTaskId);
    if (!task) return;

    const primaryAssign = assignments.find((a: any) => a.task_id === pendingRejectionTaskId && a.role === "primary");

    await supabase.from("task_rejections").insert({
      task_id: pendingRejectionTaskId,
      project_id: task.project_id || null,
      rejected_by: user.id,
      assigned_to: primaryAssign?.user_id || null,
      reason_category: category,
      comment: comment || null,
    } as any);

    onStatusChange(pendingRejectionTaskId, "corrections");
    setPendingRejectionTaskId(null);
  };

  const validateAndMove = (taskId: string, newStatus: string) => {
    const task = optimisticTasks.find((t: any) => t.id === taskId);
    if (!task) return;

    const taskAssigns = getTaskAssignments(taskId);
    if (taskAssigns.length === 0) {
      toast.error("Nie można zmienić statusu! Przypisz najpierw osobę do tego zadania.");
      return;
    }

    if (task.status === "in_progress" && newStatus === "review") {
      if (!isChecklistComplete(taskId)) {
        setChecklistBlockOpen(true);
        return;
      }
    }

    if (newStatus === "client_review" && task.status !== "review" && task.status !== "corrections") {
      toast.error("Zadanie może trafić do akceptacji klienta tylko ze statusu Weryfikacja lub Poprawki");
      return;
    }

    if (task.status === "review" && newStatus === "client_review") {
      setPendingMove({ taskId, newStatus });
      setResponsibilityOpen(true);
      return;
    }

    if (newStatus === "corrections") {
      setPendingRejectionTaskId(taskId);
      setRejectionOpen(true);
      return;
    }

    onStatusChange(taskId, newStatus);
  };

  const activeColumns = isClientMode ? CLIENT_KANBAN_COLUMNS : KANBAN_COLUMNS;
  const activeColumnKeys = useMemo(() => new Set(activeColumns.map((c) => c.key)), [isClientMode]);

  const tasksByColumnRaw = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    activeColumns.forEach((col) => {
      grouped[col.key] = [];
    });

    optimisticTasks.forEach((task: any) => {
      if (!task?.is_archived && task?.status) {
        const col = activeColumnKeys.has(task.status) ? task.status : "todo";
        grouped[col].push(task);
      }
    });

    activeColumns.forEach((col) => {
      grouped[col.key].sort((a: any, b: any) => compareRanks(a.lexo_rank, b.lexo_rank));
    });

    return grouped;
  }, [optimisticTasks, activeColumnKeys]);

  const tasksByColumn = useMemo(() => {
    if (sortField === "manual") return tasksByColumnRaw;

    const derived: Record<string, any[]> = {};
    activeColumns.forEach((col) => {
      derived[col.key] = sortTasks([...tasksByColumnRaw[col.key]], sortField, sortDirection);
    });
    return derived;
  }, [tasksByColumnRaw, sortField, sortDirection]);

  const getColumnTasks = useCallback(
    (columnKey: string) => {
      return tasksByColumn[columnKey] || [];
    },
    [tasksByColumn],
  );

  const handleDragEnd = (result: DropResult) => {
    if (isClientMode) return;
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const isSameColumn = source.droppableId === destination.droppableId;

    if (!isManualSort) {
      if (isSameColumn) {
        toast.info("Aby zmieniać kolejność, przełącz na sortowanie Ręczne.");
        return;
      }

      const rawDestTasks = tasksByColumnRaw[destination.droppableId] || [];
      const movedTask = optimisticTasks.find((t: any) => t.id === draggableId);
      if (!movedTask) return;

      let newRank: string;
      if (rawDestTasks.length === 0) {
        newRank = generateMidpointRank(null, null);
      } else {
        const lastRank = rawDestTasks[rawDestTasks.length - 1]?.lexo_rank;
        newRank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);
      }

      setOptimisticTasks((prev) =>
        prev.map((task: any) =>
          task.id === draggableId ? { ...task, lexo_rank: newRank, status: destination.droppableId } : task,
        ),
      );

      onLexoRankUpdate?.(draggableId, newRank);
      validateAndMove(draggableId, destination.droppableId);
      return;
    }

    const sourceColumnTasks = [...getColumnTasks(source.droppableId)];
    const destinationColumnTasks = isSameColumn ? sourceColumnTasks : [...getColumnTasks(destination.droppableId)];

    const [movedTask] = sourceColumnTasks.splice(source.index, 1);
    if (!movedTask) return;

    const targetColumnTasks = isSameColumn ? sourceColumnTasks : destinationColumnTasks;
    const destinationIndex = Math.max(0, Math.min(destination.index, targetColumnTasks.length));

    const rankAbove = destinationIndex > 0 ? (targetColumnTasks[destinationIndex - 1]?.lexo_rank ?? null) : null;
    const rankBelow = targetColumnTasks[destinationIndex]?.lexo_rank ?? null;

    let newRank: string;

    if (targetColumnTasks.length === 0) {
      newRank = generateMidpointRank(null, null);
    } else if (destinationIndex === 0) {
      newRank = rankBelow ? generateRankBefore(rankBelow) : generateMidpointRank(null, null);
    } else if (destinationIndex >= targetColumnTasks.length) {
      newRank = rankAbove ? generateRankAfter(rankAbove) : generateMidpointRank(null, null);
    } else {
      newRank = generateMidpointRank(rankAbove, rankBelow);
    }

    const optimisticMovedTask = { ...movedTask, lexo_rank: newRank };
    targetColumnTasks.splice(destinationIndex, 0, optimisticMovedTask);

    setOptimisticTasks((prev) => prev.map((task: any) => (task.id === draggableId ? optimisticMovedTask : task)));

    onLexoRankUpdate?.(draggableId, newRank);

    if (!isSameColumn) {
      validateAndMove(draggableId, destination.droppableId);
    }
  };

  const handleToggleAssign = useCallback(
    async (taskId: string, userId: string) => {
      const allTaskQueries = queryClient.getQueriesData<any[]>({ queryKey: ["tasks"] });

      const task = (optimisticTasks || []).find((t: any) => t.id === taskId);
      const currentAssignments: any[] = task?.task_assignments || [];
      const isAlreadyAssigned = currentAssignments.some((a: any) => a.user_id === userId);

      const applyOptimistic = (updater: (t: any) => any) => {
        queryClient.setQueriesData<any[]>({ queryKey: ["tasks"] }, (old) =>
          (old || []).map((t) => (t.id === taskId ? updater(t) : t)),
        );
      };

      if (isAlreadyAssigned) {
        applyOptimistic((t) => ({
          ...t,
          task_assignments: (t.task_assignments || []).filter((a: any) => a.user_id !== userId),
        }));
        const { error } = await supabase.from("task_assignments").delete().eq("task_id", taskId).eq("user_id", userId);
        if (error) {
          allTaskQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
          toast.error("Błąd usuwania przypisania");
          return;
        }
        toast.success("Usunięto przypisanie");
      } else {
        const role = currentAssignments.length === 0 ? "primary" : "collaborator";
        const staffProfile = (profiles || []).find((p: any) => p.id === userId);
        applyOptimistic((t) => ({
          ...t,
          task_assignments: [
            ...(t.task_assignments || []),
            { user_id: userId, role, profiles: { full_name: staffProfile?.full_name || "?" } },
          ],
        }));
        const { error } = await supabase.from("task_assignments").insert({
          task_id: taskId,
          user_id: userId,
          role: role as any,
        });
        if (error) {
          allTaskQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
          toast.error("Błąd przypisania");
          return;
        }
        toast.success("Przypisano osobę");
      }
      onRefresh?.();
    },
    [onRefresh, optimisticTasks, profiles, queryClient],
  );

  const handleOpenDeleteModal = useCallback((task: any) => {
    setTaskToDelete(task);
  }, []);

  const handleDeleteModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setTaskToDelete(null);
    }
  }, []);

  const handleTaskDeleted = useCallback((deletedTaskId: string) => {
    setOptimisticTasks((prev) => prev.filter((task: any) => task.id !== deletedTaskId));
  }, []);

  const cardHelpers = useMemo(
    () => ({
      getAssignee,
      getAllAssignees,
      getClient,
      getInitials,
      getAvatarColor,
      getWaitingTime,
      allProfiles: profiles || [],
      onAssign: handleToggleAssign,
      onArchive,
      onOpenDeleteModal: handleOpenDeleteModal,
      canDeleteTask,
      isClientMode,
    }),
    [getAssignee, getAllAssignees, getClient, profiles, handleToggleAssign, onArchive, handleOpenDeleteModal, canDeleteTask, isClientMode],
  );

  return (
    <>
      <ChecklistBlockModal open={checklistBlockOpen} onOpenChange={setChecklistBlockOpen} />
      <RejectionModal
        open={rejectionOpen}
        onOpenChange={(v) => {
          setRejectionOpen(v);
          if (!v) setPendingRejectionTaskId(null);
        }}
        onConfirm={handleRejectionConfirm}
      />
      <ResponsibilityModal
        open={responsibilityOpen}
        onOpenChange={setResponsibilityOpen}
        onConfirm={() => {
          if (pendingMove) {
            onStatusChange(pendingMove.taskId, pendingMove.newStatus);
            setPendingMove(null);
          }
        }}
      />
      <DeleteTaskModal
        open={!!taskToDelete}
        task={taskToDelete}
        onOpenChange={handleDeleteModalOpenChange}
        onDeleted={handleTaskDeleted}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-16rem)] items-stretch gap-3 overflow-x-auto overflow-y-hidden w-full pb-4 min-h-0">
          {activeColumns.map((col) => (
            <KanbanColumn
              key={col.key}
              columnKey={col.key}
              label={col.label}
              tasks={getColumnTasks(col.key)}
              isClientMode={isClientMode}
              onQuickAdd={onQuickAdd}
              cardHelpers={cardHelpers}
            />
          ))}
        </div>
      </DragDropContext>
    </>
  );
}

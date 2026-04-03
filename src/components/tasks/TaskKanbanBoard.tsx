import React, { useCallback, useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Clock, UserPlus, Archive, GripVertical, Plus, Trash2, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { toast } from "sonner";
import { ChecklistBlockModal, ResponsibilityModal } from "./WorkflowModals";
import { RejectionModal } from "./RejectionModal";
import { DeleteTaskModal } from "./DeleteTaskModal";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { compareRanks, generateMidpointRank, generateRankAfter, generateRankBefore } from "@/lib/lexoRank";
import { sortTasks } from "@/lib/taskSorting";
import type { SortField, SortDirection } from "@/components/tasks/TaskFilters";

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

const KANBAN_COLUMN_KEYS = new Set(KANBAN_COLUMNS.map((c) => c.key));

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  critical: { label: "PILNY", border: "border-destructive", bg: "bg-destructive", text: "text-destructive-foreground" },
  high: { label: "WYSOKI", border: "border-warning", bg: "bg-warning/15", text: "text-warning-foreground" },
  medium: { label: "ŚREDNI", border: "border-destructive/40", bg: "bg-destructive/10", text: "text-destructive" },
  low: { label: "NISKI", border: "border-border", bg: "bg-muted", text: "text-muted-foreground" },
};

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
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { currentRole, roleLoading } = useRole();
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

  // Usuń tę linię — używaj props.profiles zamiast

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

    // Intercept drag to corrections — show rejection modal
    if (newStatus === "corrections") {
      setPendingRejectionTaskId(taskId);
      setRejectionOpen(true);
      return;
    }

    onStatusChange(taskId, newStatus);
  };

  const activeColumns = isClientMode ? CLIENT_KANBAN_COLUMNS : KANBAN_COLUMNS;
  const activeColumnKeys = useMemo(() => new Set(activeColumns.map((c) => c.key)), [isClientMode]);

  // Source of truth: always sorted by lexo_rank (never mutated)
  const tasksByColumnRaw = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    activeColumns.forEach((col) => {
      grouped[col.key] = [];
    });

    optimisticTasks.forEach((task: any) => {
      if (!task?.is_archived && task?.status) {
        // Map to valid column; fallback to "todo" for unknown/internal statuses
        const col = activeColumnKeys.has(task.status) ? task.status : "todo";
        grouped[col].push(task);
      }
    });

    // Always sort source of truth by lexo_rank
    activeColumns.forEach((col) => {
      grouped[col.key].sort((a: any, b: any) => compareRanks(a.lexo_rank, b.lexo_rank));
    });

    return grouped;
  }, [optimisticTasks, activeColumnKeys]);

  // Derived state: sorted copy for display based on current sortField
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

    // --- SMART DROP: non-manual sort mode ---
    if (!isManualSort) {
      if (isSameColumn) {
        // Block vertical reordering in non-manual sort
        toast.info("Aby zmieniać kolejność, przełącz na sortowanie Ręczne.");
        return;
      }

      // Cross-column move (status change) — allowed in any sort mode
      // Use tasksByColumnRaw (lexo_rank source of truth) for rank calculation
      const rawDestTasks = tasksByColumnRaw[destination.droppableId] || [];
      const movedTask = optimisticTasks.find((t: any) => t.id === draggableId);
      if (!movedTask) return;

      // Calculate rank: append to bottom of destination column
      let newRank: string;
      if (rawDestTasks.length === 0) {
        newRank = generateMidpointRank(null, null);
      } else {
        const lastRank = rawDestTasks[rawDestTasks.length - 1]?.lexo_rank;
        newRank = lastRank ? generateRankAfter(lastRank) : generateMidpointRank(null, null);
      }

      // Optimistic update — useMemo will auto-sort by active sortField
      setOptimisticTasks((prev) =>
        prev.map((task: any) =>
          task.id === draggableId ? { ...task, lexo_rank: newRank, status: destination.droppableId } : task,
        ),
      );

      onLexoRankUpdate?.(draggableId, newRank);
      validateAndMove(draggableId, destination.droppableId);
      return;
    }

    // --- MANUAL SORT MODE: full LexoRank reordering ---
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
      // Snapshot all task queries for rollback
      const allTaskQueries = queryClient.getQueriesData<any[]>({ queryKey: ["tasks"] });

      // Check if user is already assigned
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
          {activeColumns.map((col) => {
            const columnTasks = getColumnTasks(col.key);
            const isEmpty = columnTasks.length === 0;
            return (
              <div key={col.key} className="w-72 flex-shrink-0 self-stretch flex flex-col">
                <div
                  className={`flex flex-col flex-1 min-h-0 rounded-xl border border-dashed ${isEmpty ? "border-muted-foreground/20" : "border-destructive/30"} bg-card/50`}
                >
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold tracking-wider text-foreground">{col.label}</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {columnTasks.length}{" "}
                        {columnTasks.length === 1 ? "zadanie" : columnTasks.length < 5 ? "zadania" : "zadań"}
                      </span>
                    </div>
                    {!isClientMode && onQuickAdd && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => onQuickAdd(col.key)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? "bg-destructive/5" : ""}`}
                      >
                        {columnTasks.map((task: any, index: number) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isClientMode}>
                            {(provided, snapshot) => (
                              <KanbanCard
                                task={task}
                                provided={provided}
                                isDragging={snapshot.isDragging}
                                columnKey={col.key}
                                getAssignee={getAssignee}
                                getAllAssignees={getAllAssignees}
                                getClient={getClient}
                                getInitials={getInitials}
                                getAvatarColor={getAvatarColor}
                                getWaitingTime={getWaitingTime}
                                allProfiles={profiles || []}
                                onAssign={handleToggleAssign}
                                onArchive={onArchive}
                                onOpenDeleteModal={handleOpenDeleteModal}
                                canDeleteTask={canDeleteTask}
                                isClientMode={isClientMode}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {isEmpty && <p className="text-xs text-muted-foreground text-center py-8">Pusto</p>}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
}

interface KanbanCardProps {
  task: any;
  provided: any;
  isDragging: boolean;
  columnKey: string;
  getAssignee: (taskId: string) => any;
  getAllAssignees: (taskId: string) => any[];
  getClient: (clientId: string | null) => any;
  getInitials: (name: string) => string;
  getAvatarColor: (userId: string) => string;
  getWaitingTime: (updatedAt: string) => string | null;
  allProfiles: any[];
  onAssign: (taskId: string, userId: string) => void;
  onArchive?: (taskId: string) => void;
  onOpenDeleteModal?: (task: any) => void;
  canDeleteTask?: boolean;
  isClientMode?: boolean;
}

const KanbanCard = React.memo(function KanbanCard({
  task,
  provided,
  isDragging,
  columnKey,
  getAssignee,
  getAllAssignees,
  getClient,
  getInitials,
  getAvatarColor,
  getWaitingTime,
  allProfiles,
  onAssign,
  onArchive,
  onOpenDeleteModal,
  canDeleteTask,
  isClientMode = false,
}: KanbanCardProps) {
  const taskAssignees = getAllAssignees(task.id);
  const client = getClient(task.client_id);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isUnassigned = taskAssignees.length === 0;
  const showWaiting = columnKey === "client_review" || columnKey === "corrections" || columnKey === "review";
  const waitingTime = showWaiting ? getWaitingTime(task.updated_at || task.created_at) : null;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`rounded-lg border shadow-sm transition-shadow touch-none ${isUnassigned ? "bg-destructive/15 border-destructive/50 ring-2 ring-destructive/30" : task.is_misunderstood ? "bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/30" : "bg-card"} ${task.not_understood && !task.is_misunderstood ? "ring-2 ring-amber-500/50 border-amber-500/30" : ""} ${task.correction_severity === "critical" ? "ring-2 ring-destructive/50" : ""} ${isDragging ? "shadow-lg ring-2 ring-destructive/20" : "hover:shadow-md"}`}
    >
      <Link to={`/tasks/${task.id}`} className="block px-2 pt-1.5 pb-1">
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-foreground leading-tight break-words">{task.title}</p>
            {client && (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[9px] text-muted-foreground truncate">{client.name}</p>
                {client.has_retainer && (
                  <Badge className="text-[7px] h-3 px-1 bg-amber-500/90 text-white border-0 shrink-0">
                    STAŁA OPIEKA
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-px">
            <Badge
              variant="outline"
              className={`text-[8px] h-3.5 px-1 font-bold border ${priority.border} ${priority.bg} ${priority.text} rounded whitespace-nowrap`}
            >
              {priority.label}
            </Badge>
            {task.due_date && (
              <span
                className={`text-[9px] font-semibold whitespace-nowrap ${new Date(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground"}`}
              >
                {new Date(task.due_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {(task.is_misunderstood || task.not_understood || task.correction_severity) && (
          <div className="flex items-center gap-1 mt-0.5">
            {task.is_misunderstood && (
              <Badge className="text-[7px] h-3 px-0.5 bg-amber-500 text-white">⚠️ Niezrozumiałe</Badge>
            )}
            {task.not_understood && !task.is_misunderstood && (
              <Badge className="text-[7px] h-3 px-0.5 bg-warning text-warning-foreground">❓</Badge>
            )}
            {task.correction_severity && (
              <Badge
                className={`text-[7px] h-3 px-0.5 ${task.correction_severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-warning/15 text-warning border-warning/30"}`}
              >
                {task.correction_severity === "critical" ? "KRYT" : "POPR"}
              </Badge>
            )}
          </div>
        )}

        {waitingTime && (
          <div className="flex items-center gap-0.5 text-[8px] text-destructive-foreground font-semibold mt-1 bg-destructive rounded px-1 py-0.5 w-fit">
            <Clock className="h-2 w-2" />
            {waitingTime}
          </div>
        )}
      </Link>

      <div className="px-2 pb-1.5 flex items-end justify-between">
        {!isClientMode && (
          <div className="flex items-center gap-0.5 min-w-0">
            {taskAssignees.slice(0, 3).map((person: any) => (
              <Tooltip key={person.id} delayDuration={200}>
                <TooltipTrigger asChild>
                  <Avatar className="h-4 w-4 -ml-0.5 first:ml-0 ring-1 ring-background">
                    <AvatarFallback className={`text-[7px] text-white font-bold ${getAvatarColor(person.id)}`}>
                      {getInitials(person.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {person.full_name}
                  {person.assignRole !== "primary" ? ` (${person.assignRole})` : ""}
                </TooltipContent>
              </Tooltip>
            ))}
            {taskAssignees.length > 3 && (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Avatar className="h-4 w-4 -ml-0.5 ring-1 ring-background">
                    <AvatarFallback className="text-[6px] font-bold bg-muted text-muted-foreground">
                      +{taskAssignees.length - 3}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {taskAssignees.slice(3).map((p: any) => p.full_name).join(", ")}
                </TooltipContent>
              </Tooltip>
            )}
            <AssignPopover
              taskId={task.id}
              assignedUserIds={taskAssignees.map((p: any) => p.id)}
              allProfiles={allProfiles}
              getInitials={getInitials}
              getAvatarColor={getAvatarColor}
              onAssign={onAssign}
              showAvatarInTrigger={false}
            />
          </div>
        )}
        {!isClientMode && (
          <div className="flex items-end gap-1 flex-shrink-0">
            {task.estimated_time > 0 && task.logged_time > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Clock className="h-2 w-2" />
                {(task.logged_time / 60).toFixed(1)}h
              </span>
            )}
            {(columnKey === "closed" || (isSuperAdmin && onOpenDeleteModal)) && (
              <div className="flex flex-col items-end gap-1 mt-2 relative z-10">
                {columnKey === "closed" && onArchive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1 text-[8px] gap-0.5 text-muted-foreground hover:text-primary"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onArchive(task.id);
                    }}
                  >
                    <Archive className="h-2 w-2" />
                    Archiwizuj
                  </Button>
                )}
                {isSuperAdmin && onOpenDeleteModal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1 text-[8px] gap-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenDeleteModal(task);
                    }}
                  >
                    <Trash2 className="h-2 w-2" />
                    Usuń
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function AssignPopover({
  taskId,
  assignedUserIds = [],
  allProfiles,
  getInitials,
  getAvatarColor,
  onAssign,
  showAvatarInTrigger = true,
}: {
  taskId: string;
  assignedUserIds: string[];
  allProfiles: any[];
  getInitials: (name: string) => string;
  getAvatarColor: (id: string) => string;
  onAssign: (taskId: string, userId: string) => void;
  showAvatarInTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasAssignees = assignedUserIds.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center hover:bg-accent rounded px-0.5 py-0.5 transition-colors"
        >
          {!showAvatarInTrigger ? (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary">
              <UserPlus className="h-2 w-2" />
            </span>
          ) : hasAssignees ? (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary">
              <UserPlus className="h-2 w-2" />
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-transparent bg-destructive px-2 py-0.5 text-[8px] font-bold text-destructive-foreground gap-0.5">
              <UserPlus className="h-2.5 w-2.5" />
              PRZYPISZ
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-1"
        align="start"
        side="bottom"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Przypisz / odpisz osobę</p>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {allProfiles.map((p: any) => {
            const isAssigned = assignedUserIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onAssign(taskId, p.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left ${isAssigned ? "bg-accent/50" : ""}`}
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className={`text-[8px] text-white font-bold ${getAvatarColor(p.id)}`}>
                    {getInitials(p.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs flex-1">{p.full_name}</span>
                {isAssigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

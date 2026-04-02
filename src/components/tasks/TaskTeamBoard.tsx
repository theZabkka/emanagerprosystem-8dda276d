import React, { useCallback, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { toast } from "sonner";
import { getMidpointRank, getAfterRank, getBeforeRank } from "@/lib/lexoRank";

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  critical: { label: "PILNY", border: "border-destructive", bg: "bg-destructive", text: "text-destructive-foreground" },
  high: { label: "WYSOKI", border: "border-warning", bg: "bg-warning/15", text: "text-warning-foreground" },
  medium: { label: "ŚREDNI", border: "border-destructive/40", bg: "bg-destructive/10", text: "text-destructive" },
  low: { label: "NISKI", border: "border-border", bg: "bg-muted", text: "text-muted-foreground" },
};

const AVATAR_COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600"];

const STATUS_LABELS: Record<string, string> = {
  new: "NOWE", todo: "DO ZROBIENIA", in_progress: "W REALIZACJI", review: "WERYFIKACJA",
  corrections: "POPRAWKI", client_review: "AKCEPTACJA", done: "GOTOWE",
  waiting_for_client: "OCZEKIWANIE", client_verified: "ZWERYFIKOWANE", closed: "ZAMKNIĘTE",
};
const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted text-foreground", in_progress: "bg-destructive/10 text-destructive border-destructive/30",
  review: "bg-warning/10 text-warning-foreground border-warning/30", corrections: "bg-destructive/10 text-destructive border-destructive/30",
  client_review: "bg-destructive/10 text-destructive border-destructive/30", done: "bg-muted text-muted-foreground",
  new: "bg-muted text-muted-foreground", waiting_for_client: "bg-warning/10 text-warning-foreground",
  client_verified: "bg-muted text-muted-foreground", closed: "bg-muted text-muted-foreground",
};

interface TaskTeamBoardProps {
  tasks: any[];
  onRefresh?: () => void;
  priorityFilter: string;
  onPersonClick?: (userId: string) => void;
}

export default function TaskTeamBoard({ tasks, onRefresh, priorityFilter, onPersonClick }: TaskTeamBoardProps) {
  const queryClient = useQueryClient();
  const { data: staffMembers = [] } = useStaffMembers();

  // Build assignments from task data
  const assignments = useMemo(() =>
    tasks.flatMap((t: any) => (t.task_assignments || []).map((a: any) => ({ ...a, task_id: t.id }))),
    [tasks]
  );

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getUserTasks = useCallback((userId: string | null) => {
    if (userId === null) {
      const assignedTaskIds = new Set(assignments.filter((a: any) => a.role === "primary").map((a: any) => a.task_id));
      return tasks.filter(t => !assignedTaskIds.has(t.id));
    }
    const userTaskIds = assignments.filter((a: any) => a.user_id === userId && a.role === "primary").map((a: any) => a.task_id);
    return tasks.filter(t => userTaskIds.includes(t.id));
  }, [tasks, assignments]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newDropId = result.destination.droppableId;
    const oldDropId = result.source.droppableId;

    if (newDropId === oldDropId) {
      // Same column reorder — update lexo_rank
      const colUserId = newDropId === "unassigned" ? null : newDropId;
      const destColumnTasks = getUserTasks(colUserId).filter(t => t.id !== taskId);
      const destIdx = result.destination.index;

      let newRank: string;
      if (destColumnTasks.length === 0) {
        newRank = 'U';
      } else if (destIdx === 0) {
        newRank = getBeforeRank(destColumnTasks[0]?.lexo_rank || 'U');
      } else if (destIdx >= destColumnTasks.length) {
        newRank = getAfterRank(destColumnTasks[destColumnTasks.length - 1]?.lexo_rank || 'U');
      } else {
        newRank = getMidpointRank(
          destColumnTasks[destIdx - 1]?.lexo_rank || 'A',
          destColumnTasks[destIdx]?.lexo_rank || 'z'
        );
      }

      queryClient.setQueryData<any[]>(["tasks", priorityFilter], (old) =>
        (old || []).map((t) => t.id === taskId ? { ...t, lexo_rank: newRank } : t)
      );
      await supabase.from("tasks").update({ lexo_rank: newRank } as any).eq("id", taskId);
      return;
    }

    // Cross-column: reassign primary
    const newUserId = newDropId === "unassigned" ? null : newDropId;

    // Optimistic update on task_assignments within tasks
    queryClient.setQueryData<any[]>(["tasks", priorityFilter], (old) =>
      (old || []).map((t) => {
        if (t.id !== taskId) return t;
        const filtered = (t.task_assignments || []).filter((a: any) => a.role !== "primary");
        if (newUserId) {
          filtered.push({ user_id: newUserId, role: "primary", profiles: { full_name: staffMembers.find(s => s.id === newUserId)?.full_name || "?" } });
        }
        return { ...t, task_assignments: filtered };
      })
    );

    await supabase.from("task_assignments").delete().eq("task_id", taskId).eq("role", "primary" as any);
    if (newUserId) {
      const { error } = await supabase.from("task_assignments").insert({ task_id: taskId, user_id: newUserId, role: "primary" as any });
      if (error) {
        toast.error("Nie udało się przypisać zadania.");
        onRefresh?.();
        return;
      }
    }
    toast.success("Zadanie przypisane");
    onRefresh?.();
  };

  // Filter out terminal statuses
  const activeTasks = useMemo(() =>
    tasks.filter(t => !["done", "cancelled", "closed"].includes(t.status)),
    [tasks]
  );

  const getActiveUserTasks = useCallback((userId: string | null) => {
    if (userId === null) {
      const assignedTaskIds = new Set(assignments.filter((a: any) => a.role === "primary").map((a: any) => a.task_id));
      return activeTasks.filter(t => !assignedTaskIds.has(t.id)).sort((a: any, b: any) => (a.lexo_rank || 'U').localeCompare(b.lexo_rank || 'U'));
    }
    const userTaskIds = assignments.filter((a: any) => a.user_id === userId && a.role === "primary").map((a: any) => a.task_id);
    return activeTasks.filter(t => userTaskIds.includes(t.id)).sort((a: any, b: any) => (a.lexo_rank || 'U').localeCompare(b.lexo_rank || 'U'));
  }, [activeTasks, assignments]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-16rem)] items-stretch gap-3 overflow-x-auto overflow-y-hidden w-full pb-4 min-h-0">
        {/* Unassigned column */}
        <TeamColumn
          droppableId="unassigned"
          label="NIEPRZYPISANE"
          labelColor="text-destructive"
          tasks={getActiveUserTasks(null)}
          isUnassigned
          getInitials={getInitials}
          getAvatarColor={getAvatarColor}
        />

        {staffMembers.map((p) => (
          <TeamColumn
            key={p.id}
            droppableId={p.id}
            label={p.full_name?.toUpperCase() || "—"}
            labelColor="text-foreground"
            tasks={getActiveUserTasks(p.id)}
            avatar={{ initials: getInitials(p.full_name), color: getAvatarColor(p.id) }}
            getInitials={getInitials}
            getAvatarColor={getAvatarColor}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

function TeamColumn({ droppableId, label, labelColor, tasks, avatar, isUnassigned, getInitials, getAvatarColor }: {
  droppableId: string;
  label: string;
  labelColor: string;
  tasks: any[];
  avatar?: { initials: string; color: string };
  isUnassigned?: boolean;
  getInitials: (name: string) => string;
  getAvatarColor: (id: string) => string;
}) {
  return (
    <div className="w-72 flex-shrink-0 self-stretch flex flex-col">
      <div className={`flex flex-col flex-1 min-h-0 rounded-xl border border-dashed ${isUnassigned ? "border-destructive/40" : "border-border"} bg-card/50`}>
        <div className="px-4 h-14 flex items-center gap-2 border-b border-border/30">
          {avatar && (
            <Avatar className="h-7 w-7">
              <AvatarFallback className={`text-[10px] text-white font-bold ${avatar.color}`}>{avatar.initials}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <h3 className={`text-[10px] font-semibold tracking-widest uppercase truncate ${labelColor}`}>{label}</h3>
            <span className="text-[11px] text-muted-foreground">{tasks.length} zadań</span>
          </div>
        </div>

        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? "bg-destructive/5" : ""}`}
            >
              {tasks.map((task: any, index: number) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <TeamCard
                      task={task}
                      provided={provided}
                      isDragging={snapshot.isDragging}
                      getInitials={getInitials}
                      getAvatarColor={getAvatarColor}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {tasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Brak zadań</p>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

const TeamCard = React.memo(function TeamCard({ task, provided, isDragging, getInitials, getAvatarColor }: {
  task: any; provided: any; isDragging: boolean;
  getInitials: (name: string) => string; getAvatarColor: (id: string) => string;
}) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const clientName = task.clients?.name;
  const isUnassigned = (task.task_assignments || []).length === 0;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`rounded-lg border shadow-sm transition-shadow touch-none ${isUnassigned ? "bg-destructive/15 border-destructive/50 ring-2 ring-destructive/30" : "bg-card"} ${isDragging ? "shadow-lg ring-2 ring-destructive/20" : "hover:shadow-md"}`}
    >
      <Link to={`/tasks/${task.id}`} className="block px-2 pt-1.5 pb-1">
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-foreground leading-tight break-words">{task.title}</p>
            {clientName && (
              <p className="text-[9px] text-muted-foreground truncate mt-0.5">{clientName}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-px">
            <Badge variant="outline" className={`text-[8px] h-3.5 px-1 font-bold border ${priority.border} ${priority.bg} ${priority.text} rounded whitespace-nowrap`}>
              {priority.label}
            </Badge>
            <Badge variant="outline" className={`text-[8px] h-3.5 px-1 font-bold border rounded whitespace-nowrap ${STATUS_COLORS[task.status] || ""}`}>
              {STATUS_LABELS[task.status] || task.status}
            </Badge>
          </div>
        </div>
        {task.due_date && (
          <span className={`text-[9px] font-semibold ${new Date(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground"}`}>
            {new Date(task.due_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
      </Link>
    </div>
  );
});

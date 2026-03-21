import { useCallback, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, UserPlus, Archive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { toast } from "sonner";
import { ChecklistBlockModal, ResponsibilityModal } from "./WorkflowModals";

const KANBAN_COLUMNS = [
  { key: "todo", label: "DO ZROBIENIA" },
  { key: "in_progress", label: "W REALIZACJI" },
  { key: "waiting_for_client", label: "OCZEKIWANIE NA KLIENTA" },
  { key: "review", label: "WERYFIKACJA" },
  { key: "corrections", label: "POPRAWKI" },
  { key: "client_review", label: "DO AKCEPTACJI KLIENTA" },
  { key: "client_verified", label: "ZWERYFIKOWANE" },
  { key: "closed", label: "ZAMKNIĘTE" },
] as const;

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  critical: { label: "PILNY", border: "border-destructive", bg: "bg-destructive", text: "text-destructive-foreground" },
  high: { label: "WYSOKI", border: "border-warning", bg: "bg-warning/15", text: "text-warning-foreground" },
  medium: { label: "ŚREDNI", border: "border-destructive/40", bg: "bg-destructive/10", text: "text-destructive" },
  low: { label: "NISKI", border: "border-border", bg: "bg-muted", text: "text-muted-foreground" },
};

const AVATAR_COLORS = [
  "bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600",
];

interface TaskKanbanBoardProps {
  tasks: any[];
  profiles: any[];
  assignments: any[];
  clients: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onArchive?: (taskId: string) => void;
  onRefresh?: () => void;
}

export default function TaskKanbanBoard({ tasks, profiles, assignments, clients, onStatusChange, onArchive, onRefresh }: TaskKanbanBoardProps) {
  const { isDemo } = useDataSource();
  const [checklistBlockOpen, setChecklistBlockOpen] = useState(false);
  const [responsibilityOpen, setResponsibilityOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; newStatus: string } | null>(null);

  const { data: allProfiles } = useQuery({
    queryKey: ["kanban-profiles", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles;
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").order("full_name");
      return data || [];
    },
  });

  // Fetch checklists for checklist validation
  const { data: allChecklists } = useQuery({
    queryKey: ["kanban-checklists", isDemo],
    queryFn: async () => {
      if (isDemo) return [];
      const { data } = await supabase.from("checklists").select("task_id, checklist_items(is_completed, is_na)");
      return data || [];
    },
  });

  const isChecklistComplete = useCallback((taskId: string) => {
    if (!allChecklists) return true; // no checklists = no block
    const taskChecklists = allChecklists.filter((cl: any) => cl.task_id === taskId);
    if (taskChecklists.length === 0) return true;
    for (const cl of taskChecklists) {
      const items = (cl as any).checklist_items || [];
      if (items.length === 0) continue;
      const allDone = items.every((i: any) => i.is_completed || i.is_na);
      if (!allDone) return false;
    }
    return true;
  }, [allChecklists]);

  const getAssignee = useCallback((taskId: string) => {
    const a = assignments.find((a: any) => a.task_id === taskId && a.role === "primary");
    if (!a) return null;
    return profiles.find((p: any) => p.id === a.user_id)
      || (allProfiles || []).find((p: any) => p.id === a.user_id)
      || (a.profiles ? { id: a.user_id, full_name: a.profiles.full_name } : null);
  }, [assignments, profiles, allProfiles]);

  const getClient = useCallback((clientId: string | null) => {
    if (!clientId) return null;
    return clients.find((c: any) => c.id === clientId) || null;
  }, [clients]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getAvatarColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getTaskIndex = (taskId: string) => {
    const num = taskId.replace(/\D/g, "");
    return num ? `#T${num}` : `#${taskId.slice(0, 4)}`;
  };

  const getWaitingTime = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `Czeka: ${days} dni ${hours} godz.`;
    if (hours > 0) return `Czeka: ${hours} godz.`;
    return null;
  };

  const getTaskAssignments = useCallback((taskId: string) => {
    return assignments.filter((a: any) => a.task_id === taskId);
  }, [assignments]);

  const validateAndMove = (taskId: string, newStatus: string) => {
    const task = tasks.find((t: any) => t.id === taskId);
    if (!task) return;

    // Rule: unassigned tasks cannot change status
    const taskAssigns = getTaskAssignments(taskId);
    if (taskAssigns.length === 0) {
      toast.error("Nie można zmienić statusu! Przypisz najpierw osobę do tego zadania.");
      return;
    }

    // Rule: in_progress -> review requires complete checklist
    if (task.status === "in_progress" && newStatus === "review") {
      if (!isChecklistComplete(taskId)) {
        setChecklistBlockOpen(true);
        return;
      }
    }

    // Rule: client_review only from review or corrections
    if (newStatus === "client_review" && task.status !== "review" && task.status !== "corrections") {
      toast.error("Zadanie może trafić do akceptacji klienta tylko ze statusu Weryfikacja lub Poprawki");
      return;
    }

    // Rule: review -> client_review requires responsibility confirmation
    if (task.status === "review" && newStatus === "client_review") {
      setPendingMove({ taskId, newStatus });
      setResponsibilityOpen(true);
      return;
    }

    onStatusChange(taskId, newStatus);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    validateAndMove(result.draggableId, result.destination.droppableId);
  };

  const handleAssign = async (taskId: string, userId: string) => {
    if (isDemo) {
      toast.success("Przypisano (demo)");
      return;
    }
    await supabase.from("task_assignments").delete().eq("task_id", taskId).eq("role", "primary" as any);
    const { error } = await supabase.from("task_assignments").insert({
      task_id: taskId,
      user_id: userId,
      role: "primary" as any,
    });
    if (error) {
      toast.error("Błąd przypisania");
      return;
    }
    toast.success("Przypisano osobę");
    onRefresh?.();
  };

  return (
    <>
      <ChecklistBlockModal open={checklistBlockOpen} onOpenChange={setChecklistBlockOpen} />
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 h-[calc(100vh-16rem)] overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t: any) => t.status === col.key && !t.is_archived);
            const isEmpty = columnTasks.length === 0;
            return (
              <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
                <div className={`flex flex-col flex-1 rounded-xl border border-dashed ${isEmpty ? "border-muted-foreground/20" : "border-destructive/30"} bg-card/50`}>
                  <div className="px-4 pt-3 pb-2">
                    <h3 className="text-xs font-extrabold tracking-wider text-foreground">{col.label}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {columnTasks.length} {columnTasks.length === 1 ? "zadanie" : columnTasks.length < 5 ? "zadania" : "zadań"}
                    </span>
                  </div>

                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <ScrollArea className="flex-1">
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`px-2.5 pb-2.5 space-y-2.5 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-destructive/5" : ""}`}
                        >
                          {columnTasks.map((task: any, index: number) => {
                            const assignee = getAssignee(task.id);
                            const client = getClient(task.client_id);
                            const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                            const waitingTime = (col.key === "client_review" || col.key === "corrections" || col.key === "review")
                              ? getWaitingTime(task.updated_at || task.created_at) : null;

                            const isUnassigned = !assignee;

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`rounded-lg border shadow-sm transition-shadow ${isUnassigned ? "bg-destructive/15 animate-pulse border-destructive/50 ring-2 ring-destructive/30" : "bg-card"} ${task.not_understood ? "ring-2 ring-amber-500/50 border-amber-500/30" : ""} ${task.correction_severity === "critical" ? "ring-2 ring-destructive/50" : ""} ${snapshot.isDragging ? "shadow-lg ring-2 ring-destructive/20" : "hover:shadow-md"}`}
                                  >
                                    <Link to={`/tasks/${task.id}`} className="block p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-mono text-muted-foreground font-medium">{getTaskIndex(task.id)}</span>
                                          {task.not_understood && (
                                            <Badge className="text-[9px] h-4 bg-amber-500 text-white">❓ NIEJASNE</Badge>
                                          )}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] h-5 px-2 font-bold border ${priority.border} ${priority.bg} ${priority.text} rounded-md`}
                                        >
                                          {priority.label}
                                        </Badge>
                                      </div>

                                      <p className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2">{task.title}</p>

                                      {client && (
                                        <p className="text-xs text-muted-foreground mb-3 truncate">{client.name}</p>
                                      )}

                                      {task.correction_severity && (
                                        <Badge className={`text-[9px] h-4 mb-2 ${task.correction_severity === "critical" ? "bg-destructive text-destructive-foreground" : "bg-amber-500/15 text-amber-700 border-amber-500/30"}`}>
                                          {task.correction_severity === "critical" ? "POPRAWKI KRYTYCZNE" : "MAŁE POPRAWKI"}
                                        </Badge>
                                      )}

                                      {waitingTime && (
                                        <div className="flex items-center gap-1 text-[10px] text-destructive-foreground font-semibold mb-2 bg-destructive rounded px-2 py-1 w-fit">
                                          <Clock className="h-3 w-3" />
                                          {waitingTime}
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between mt-1">
                                        <div></div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                          {task.estimated_time > 0 && task.logged_time > 0 && (
                                            <span className="flex items-center gap-0.5">
                                              <Clock className="h-3 w-3" />
                                              {(task.logged_time / 60).toFixed(1)}h
                                            </span>
                                          )}
                                          {task.due_date && (
                                            <span className={`font-medium ${new Date(task.due_date) < new Date() ? "text-destructive" : ""}`}>
                                              {new Date(task.due_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </Link>

                                    <div className="px-3 pb-2 -mt-2 flex items-center justify-between">
                                      <AssignPopover
                                        taskId={task.id}
                                        assignee={assignee}
                                        allProfiles={allProfiles || []}
                                        getInitials={getInitials}
                                        getAvatarColor={getAvatarColor}
                                        onAssign={handleAssign}
                                      />
                                      {col.key === "closed" && onArchive && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(task.id); }}
                                        >
                                          <Archive className="h-3 w-3" />
                                          Archiwizuj
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          {isEmpty && (
                            <p className="text-xs text-muted-foreground text-center py-8">Pusto</p>
                          )}
                        </div>
                      </ScrollArea>
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

function AssignPopover({
  taskId, assignee, allProfiles, getInitials, getAvatarColor, onAssign,
}: {
  taskId: string; assignee: any; allProfiles: any[];
  getInitials: (name: string) => string; getAvatarColor: (id: string) => string;
  onAssign: (taskId: string, userId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 hover:bg-accent rounded-md px-1.5 py-1 transition-colors"
        >
          {assignee ? (
            <Avatar className="h-7 w-7">
              <AvatarFallback className={`text-[10px] text-white font-bold ${getAvatarColor(assignee.id)}`}>
                {getInitials(assignee.full_name || "?")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="inline-flex items-center rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-[9px] font-bold text-destructive-foreground gap-1">
              <UserPlus className="h-3 w-3" />
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
        <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Przypisz osobę</p>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {allProfiles.map((p: any) => (
            <button
              key={p.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                await onAssign(taskId, p.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors ${assignee?.id === p.id ? "bg-accent font-medium" : ""}`}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className={`text-[8px] text-white font-bold ${getAvatarColor(p.id)}`}>
                  {getInitials(p.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              {p.full_name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

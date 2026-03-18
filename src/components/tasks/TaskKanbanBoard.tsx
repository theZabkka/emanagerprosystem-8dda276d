import { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertTriangle, HelpCircle } from "lucide-react";

const KANBAN_COLUMNS = [
  { key: "todo", label: "DO ZROBIENIA" },
  { key: "in_progress", label: "W REALIZACJI" },
  { key: "review", label: "WERYFIKACJA" },
  { key: "corrections", label: "POPRAWKI" },
  { key: "client_review", label: "DO AKCEPTACJI KLIENTA" },
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
}

export default function TaskKanbanBoard({ tasks, profiles, assignments, clients, onStatusChange }: TaskKanbanBoardProps) {
  const getAssignee = useCallback((taskId: string) => {
    const a = assignments.find((a: any) => a.task_id === taskId && a.role === "primary");
    if (!a) return null;
    return profiles.find((p: any) => p.id === a.user_id) || null;
  }, [assignments, profiles]);

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onStatusChange(result.draggableId, result.destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-[calc(100vh-16rem)] overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t: any) => t.status === col.key);
          const isEmpty = columnTasks.length === 0;
          return (
            <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
              {/* Column container with dashed border */}
              <div className={`flex flex-col flex-1 rounded-xl border border-dashed ${isEmpty ? "border-muted-foreground/20" : "border-destructive/30"} bg-card/50`}>
                {/* Header */}
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

                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`rounded-lg border bg-card shadow-sm transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-destructive/20" : "hover:shadow-md"}`}
                                >
                                  <Link to={`/tasks/${task.id}`} className="block p-3">
                                    {/* Top: ID + ? + Priority */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-mono text-muted-foreground font-medium">{getTaskIndex(task.id)}</span>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] h-5 px-2 font-bold border ${priority.border} ${priority.bg} ${priority.text} rounded-md`}
                                      >
                                        {priority.label}
                                      </Badge>
                                    </div>

                                    {/* Title */}
                                    <p className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2">{task.title}</p>

                                    {/* Client */}
                                    {client && (
                                      <p className="text-xs text-muted-foreground mb-3 truncate">{client.name}</p>
                                    )}

                                    {/* Waiting time alert */}
                                    {waitingTime && (
                                      <div className="flex items-center gap-1 text-[10px] text-destructive-foreground font-semibold mb-2 bg-destructive rounded px-2 py-1 w-fit">
                                        <Clock className="h-3 w-3" />
                                        {waitingTime}
                                      </div>
                                    )}

                                    {/* Bottom: Assignee + Date */}
                                    <div className="flex items-center justify-between mt-1">
                                      {assignee ? (
                                        <Avatar className="h-7 w-7">
                                          <AvatarFallback className={`text-[10px] text-white font-bold ${getAvatarColor(assignee.id)}`}>
                                            {getInitials(assignee.full_name || "?")}
                                          </AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <Badge variant="destructive" className="text-[9px] h-5 px-2 font-bold">
                                          NIEPRZYPISANE!
                                        </Badge>
                                      )}

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
  );
}

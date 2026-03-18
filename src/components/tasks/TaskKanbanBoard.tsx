import { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertTriangle } from "lucide-react";

const KANBAN_COLUMNS = [
  { key: "todo", label: "DO ZROBIENIA" },
  { key: "in_progress", label: "W REALIZACJI" },
  { key: "review", label: "WERYFIKACJA" },
  { key: "corrections", label: "POPRAWKI" },
  { key: "client_review", label: "DO AKCEPTACJI KLIENTA" },
] as const;

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "PILNY", className: "bg-destructive text-destructive-foreground border-destructive" },
  high: { label: "WYSOKI", className: "bg-warning/15 text-warning-foreground border-warning" },
  medium: { label: "ŚREDNI", className: "bg-destructive/10 text-destructive border-destructive/50" },
  low: { label: "NISKI", className: "bg-muted text-muted-foreground border-border" },
};

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
    const profile = profiles.find((p: any) => p.id === a.user_id);
    return profile || null;
  }, [assignments, profiles]);

  const getClient = useCallback((clientId: string | null) => {
    if (!clientId) return null;
    return clients.find((c: any) => c.id === clientId) || null;
  }, [clients]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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
    const { draggableId } = result;
    const newStatus = result.destination.droppableId;
    onStatusChange(draggableId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t: any) => t.status === col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
              {/* Column Header */}
              <div className="px-3 py-2.5 mb-2">
                <h3 className="text-xs font-bold tracking-wider text-foreground">{col.label}</h3>
                <span className="text-[11px] text-muted-foreground">{columnTasks.length} {columnTasks.length === 1 ? "zadanie" : columnTasks.length < 5 ? "zadania" : "zadań"}</span>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <ScrollArea className="flex-1">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-1.5 space-y-2 min-h-[200px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                    >
                      {columnTasks.map((task: any, index: number) => {
                        const assignee = getAssignee(task.id);
                        const client = getClient(task.client_id);
                        const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        const waitingTime = (col.key === "client_review" || col.key === "corrections") ? getWaitingTime(task.updated_at || task.created_at) : null;

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-lg border bg-card shadow-sm transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"}`}
                              >
                                <Link to={`/tasks/${task.id}`} className="block p-3">
                                  {/* Top row: ID + priority */}
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-mono text-muted-foreground">{getTaskIndex(task.id)}</span>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-bold border ${priority.className}`}>
                                      {priority.label}
                                    </Badge>
                                  </div>

                                  {/* Title */}
                                  <p className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-2">{task.title}</p>

                                  {/* Client */}
                                  {client && (
                                    <p className="text-xs text-muted-foreground mb-2 truncate">{client.name}</p>
                                  )}

                                  {/* Waiting time alert */}
                                  {waitingTime && (
                                    <div className="flex items-center gap-1 text-[10px] text-destructive font-medium mb-2 bg-destructive/10 rounded px-1.5 py-0.5 w-fit">
                                      <AlertTriangle className="h-3 w-3" />
                                      {waitingTime}
                                    </div>
                                  )}

                                  {/* Bottom row: assignee + due date */}
                                  <div className="flex items-center justify-between mt-1">
                                    {assignee ? (
                                      <div className="flex items-center gap-1.5">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                            {getInitials(assignee.full_name || "?")}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>
                                    ) : (
                                      <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-bold">
                                        NIEPRZYPISANE!
                                      </Badge>
                                    )}

                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      {task.logged_time > 0 && (
                                        <span className="flex items-center gap-0.5">
                                          <Clock className="h-3 w-3" />
                                          {(task.logged_time / 60).toFixed(1)}h
                                        </span>
                                      )}
                                      {task.due_date && (
                                        <span className={`ml-1 ${new Date(task.due_date) < new Date() ? "text-destructive font-medium" : ""}`}>
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
                      {columnTasks.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">Brak zadań</p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

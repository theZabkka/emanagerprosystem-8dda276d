import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Clock, Archive, Trash2 } from "lucide-react";
import { AssignPopover } from "./AssignPopover";

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  critical: { label: "PILNY", border: "border-destructive", bg: "bg-destructive", text: "text-destructive-foreground" },
  high: { label: "WYSOKI", border: "border-warning", bg: "bg-warning/15", text: "text-warning-foreground" },
  medium: { label: "ŚREDNI", border: "border-destructive/40", bg: "bg-destructive/10", text: "text-destructive" },
  low: { label: "NISKI", border: "border-border", bg: "bg-muted", text: "text-muted-foreground" },
};

export interface KanbanCardProps {
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

export const KanbanCard = React.memo(function KanbanCard({
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
            {(columnKey === "closed" || (canDeleteTask && onOpenDeleteModal)) && (
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
                {canDeleteTask && onOpenDeleteModal && (
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

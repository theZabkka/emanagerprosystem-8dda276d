import { useState } from "react";
import { UserPlus, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AssignPopoverProps {
  taskId: string;
  assignedUserIds: string[];
  allProfiles: any[];
  getInitials: (name: string) => string;
  getAvatarColor: (id: string) => string;
  onAssign: (taskId: string, userId: string) => void;
  showAvatarInTrigger?: boolean;
}

export function AssignPopover({
  taskId,
  assignedUserIds = [],
  allProfiles,
  getInitials,
  getAvatarColor,
  onAssign,
  showAvatarInTrigger = true,
}: AssignPopoverProps) {
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

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { KanbanCard, type KanbanCardProps } from "./KanbanCard";

export interface KanbanColumnProps {
  columnKey: string;
  label: string;
  tasks: any[];
  isClientMode: boolean;
  onQuickAdd?: (status: string) => void;
  /** Shared helpers passed down to KanbanCard */
  cardHelpers: Omit<KanbanCardProps, "task" | "provided" | "isDragging" | "columnKey">;
  isTruncated?: boolean;
}

export function KanbanColumn({
  columnKey,
  label,
  tasks,
  isClientMode,
  onQuickAdd,
  cardHelpers,
  isTruncated = false,
}: KanbanColumnProps) {
  const isEmpty = tasks.length === 0;

  return (
    <div className="w-72 flex-shrink-0 self-stretch flex flex-col">
      <div
        className={`flex flex-col flex-1 min-h-0 rounded-xl border border-dashed ${isEmpty ? "border-muted-foreground/20" : "border-destructive/30"} bg-card/50`}
      >
        <div className="px-4 pt-3 pb-2 flex items-start justify-between">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-foreground">{label}</h3>
            <span className="text-[11px] text-muted-foreground">
              {tasks.length}{" "}
              {tasks.length === 1 ? "zadanie" : tasks.length < 5 ? "zadania" : "zadań"}
            </span>
          </div>
          {!isClientMode && onQuickAdd && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={() => onQuickAdd(columnKey)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Droppable droppableId={columnKey}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? "bg-destructive/5" : ""}`}
            >
              {tasks.map((task: any, index: number) => (
                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isClientMode}>
                  {(dragProvided, dragSnapshot) => (
                    <KanbanCard
                      task={task}
                      provided={dragProvided}
                      isDragging={dragSnapshot.isDragging}
                      columnKey={columnKey}
                      {...cardHelpers}
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
}

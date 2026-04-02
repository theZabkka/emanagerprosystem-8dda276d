import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getMidpointRank, getAfterRank, getBeforeRank } from "@/lib/lexoRank";

const statusLabels: Record<string, string> = {
  new: "NOWE",
  todo: "DO ZROBIENIA",
  in_progress: "W REALIZACJI",
  review: "WERYFIKACJA",
  corrections: "POPRAWKI",
  client_review: "DO AKCEPTACJI KLIENTA",
  done: "GOTOWE",
};
const statusColors: Record<string, string> = {
  todo: "bg-muted text-foreground",
  in_progress: "bg-destructive/10 text-destructive border-destructive/30",
  review: "bg-warning/10 text-warning-foreground border-warning/30",
  corrections: "bg-destructive/10 text-destructive border-destructive/30",
  client_review: "bg-destructive/10 text-destructive border-destructive/30",
  done: "bg-muted text-muted-foreground",
  new: "bg-muted text-muted-foreground",
};
const priorityLabels: Record<string, string> = { critical: "PILNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI" };
const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning/15 text-warning-foreground border-warning",
  medium: "bg-destructive/10 text-destructive border-destructive/40",
  low: "bg-muted text-muted-foreground border-border",
};

const AVATAR_COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-teal-600"];

export default function TeamBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const STAFF_ROLES = ["superadmin", "boss", "koordynator", "specjalista", "praktykant"];

  import { useStaffMembers } from "@/hooks/useStaffMembers";
  // ...
  const { data: profiles = [] } = useStaffMembers();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tb-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, clients(name)")
        .not("status", "in", "(done,cancelled)")
        .eq("is_archived", false)
        .limit(500)
        .order("lexo_rank" as any, { ascending: true });

      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["tb-assignments"],
    queryFn: async () => {
      // Tylko przypisania do aktywnych (niearkiwizowanych) zadań
      const taskIds = (tasks || []).map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase.from("task_assignments").select("task_id, user_id, role").in("task_id", taskIds);
      return data || [];
    },
    enabled: tasks.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const getInitials = (name: string | null) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getUserTasks = useCallback(
    (userId: string | null) => {
      let userTaskIds: string[];
      if (userId === null) {
        const assignedTaskIds = new Set(assignments.filter((a) => a.role === "primary").map((a) => a.task_id));
        userTaskIds = tasks.filter((t) => !assignedTaskIds.has(t.id)).map((t) => t.id);
      } else {
        userTaskIds = assignments.filter((a) => a.user_id === userId && a.role === "primary").map((a) => a.task_id);
      }
      let filtered = tasks.filter((t) => userTaskIds.includes(t.id));
      if (search) filtered = filtered.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
      if (priorityFilter !== "all") filtered = filtered.filter((t) => t.priority === priorityFilter);
      // Already sorted by lexo_rank from query
      return filtered.sort((a: any, b: any) => (a.lexo_rank || "U").localeCompare(b.lexo_rank || "U"));
    },
    [tasks, assignments, search, priorityFilter],
  );

  const handleLexoRankUpdate = useCallback(
    async (taskId: string, newRank: string) => {
      // Optimistic update
      queryClient.setQueryData<any[]>(["tb-tasks"], (old) =>
        (old || []).map((t) => (t.id === taskId ? { ...t, lexo_rank: newRank } : t)),
      );

      const { error } = await supabase
        .from("tasks")
        .update({ lexo_rank: newRank } as any)
        .eq("id", taskId);

      if (error) {
        queryClient.invalidateQueries({ queryKey: ["tb-tasks"] });
        toast.error("Nie udało się zapisać kolejności.");
      }
    },
    [queryClient],
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newDropId = result.destination.droppableId;
    const oldDropId = result.source.droppableId;
    const sameColumn = newDropId === oldDropId;

    // Calculate new lexo_rank
    const colUserId = newDropId === "unassigned" ? null : newDropId;
    const destColumnTasks = getUserTasks(colUserId).filter((t) => t.id !== taskId);
    const destIdx = result.destination.index;

    let newRank: string;
    if (destColumnTasks.length === 0) {
      newRank = "U";
    } else if (destIdx === 0) {
      newRank = getBeforeRank(destColumnTasks[0]?.lexo_rank || "U");
    } else if (destIdx >= destColumnTasks.length) {
      newRank = getAfterRank(destColumnTasks[destColumnTasks.length - 1]?.lexo_rank || "U");
    } else {
      const rankAbove = destColumnTasks[destIdx - 1]?.lexo_rank || "A";
      const rankBelow = destColumnTasks[destIdx]?.lexo_rank || "z";
      newRank = getMidpointRank(rankAbove, rankBelow);
    }

    // Always update rank
    handleLexoRankUpdate(taskId, newRank);

    // Cross-column: reassign primary
    if (!sameColumn) {
      const newUserId = newDropId === "unassigned" ? null : newDropId;
      const oldUserId = oldDropId === "unassigned" ? null : oldDropId;
      if (newUserId === oldUserId) return;

      const previousAssignments = queryClient.getQueryData<any[]>(["tb-assignments"]);
      queryClient.setQueryData<any[]>(["tb-assignments"], (old) => {
        const filtered = (old || []).filter((a) => !(a.task_id === taskId && a.role === "primary"));
        if (newUserId) {
          filtered.push({ task_id: taskId, user_id: newUserId, role: "primary" });
        }
        return filtered;
      });

      await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("role", "primary" as any);
      if (newUserId) {
        const { error } = await supabase
          .from("task_assignments")
          .insert({ task_id: taskId, user_id: newUserId, role: "primary" as any });
        if (error) {
          queryClient.setQueryData(["tb-assignments"], previousAssignments);
          toast.error("Nie udało się przypisać zadania.");
          return;
        }
      }
      toast.success("Zadanie przypisane");
      queryClient.invalidateQueries({ queryKey: ["tb-assignments"] });
    }
  };

  return (
    <AppLayout title="Tablica zespołu">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Aktywne zadania wg osoby — przeciągnij, aby przypisać</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center [&_svg]:pointer-events-none">
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj zadań..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Wszystkie priorytety" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie priorytety</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-[calc(100vh-14rem)] overflow-x-auto pb-4">
            {/* Unassigned column */}
            <PersonColumn
              droppableId="unassigned"
              label="NIEPRZYPISANE"
              labelColor="text-destructive"
              tasks={getUserTasks(null)}
              isUnassigned
            />

            {/* Person columns */}
            {profiles.map((p) => (
              <PersonColumn
                key={p.id}
                droppableId={p.id}
                label={p.full_name?.toUpperCase() || "—"}
                labelColor="text-foreground"
                tasks={getUserTasks(p.id)}
                avatar={{ initials: getInitials(p.full_name), color: getAvatarColor(p.id) }}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </AppLayout>
  );
}

function PersonColumn({
  droppableId,
  label,
  labelColor,
  tasks,
  avatar,
  isUnassigned,
}: {
  droppableId: string;
  label: string;
  labelColor: string;
  tasks: any[];
  avatar?: { initials: string; color: string };
  isUnassigned?: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div
        className={`flex flex-col flex-1 rounded-xl border border-dashed ${isUnassigned ? "border-destructive/40" : "border-border"} bg-card/50`}
      >
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          {avatar && (
            <Avatar className="h-7 w-7">
              <AvatarFallback className={`text-[10px] text-white font-bold ${avatar.color}`}>
                {avatar.initials}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h3 className={`text-xs font-extrabold tracking-wider ${labelColor}`}>{label}</h3>
            <span className="text-[11px] text-muted-foreground">{tasks.length} zadań</span>
          </div>
        </div>

        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <ScrollArea className="flex-1">
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`px-2.5 pb-2.5 space-y-2.5 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-destructive/5" : ""}`}
              >
                {tasks.map((task: any, index: number) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-destructive/20" : "hover:shadow-md"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-2 font-bold border rounded-md ${priorityColors[task.priority] || ""}`}
                          >
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-2 font-bold border rounded-md ${statusColors[task.status] || ""}`}
                          >
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-foreground leading-snug mb-0.5 line-clamp-2">
                          {task.title}
                        </p>
                        {task.clients?.name && (
                          <p className="text-xs text-muted-foreground mb-2 truncate">{task.clients.name}</p>
                        )}
                        {task.due_date && (
                          <span
                            className={`text-[11px] font-medium ${new Date(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            {new Date(task.due_date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Brak zadań</p>}
              </div>
            </ScrollArea>
          )}
        </Droppable>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Star, Archive, CheckCircle2, ArchiveIcon } from "lucide-react";
import { toast } from "sonner";
import { OperationalArchiveDrawer } from "@/components/operational/OperationalArchiveDrawer";

interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface TaskRating {
  task_id: string;
  user_id: string;
  rating: number;
}

const ACTIVE_COLUMNS = [
  { key: "Do zrobienia", color: "bg-blue-500/10" },
  { key: "W trakcie", color: "bg-yellow-500/10" },
  { key: "Zrealizowane", color: "bg-green-500/10" },
];

const TYPE_COLORS: Record<string, string> = {
  Zakupy: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Innowacja: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  Usterka: "bg-destructive/20 text-destructive",
  Inne: "bg-muted text-muted-foreground",
};

const CAN_RATE_ROLES = ["boss", "koordynator", "specjalista"];

export default function OperationalBoard() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("Inne");

  const { data: tasks = [] } = useQuery<InternalTask[]>({
    queryKey: ["internal-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_tasks")
        .select("*, profiles:created_by(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as InternalTask[];
    },
  });

  const { data: allRatings = [] } = useQuery<TaskRating[]>({
    queryKey: ["internal-task-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_task_ratings")
        .select("task_id, user_id, rating");
      if (error) throw error;
      return (data || []) as TaskRating[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "Zrealizowane" || status === "Zakończone") updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
      const { error } = await supabase.from("internal_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-tasks"] });
      toast.error("Nie udało się zaktualizować statusu");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-tasks"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("internal_tasks").insert({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        type: newType,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-tasks"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewType("Inne");
      toast.success("Zgłoszenie dodane");
    },
    onError: () => toast.error("Błąd tworzenia zgłoszenia"),
  });

  const rateMutation = useMutation({
    mutationFn: async ({ taskId, rating }: { taskId: string; rating: number }) => {
      const { error } = await supabase.from("internal_task_ratings").upsert(
        { task_id: taskId, user_id: user!.id, rating },
        { onConflict: "task_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-task-ratings"] });
    },
    onError: () => toast.error("Błąd zapisywania oceny"),
  });

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId;
      const taskId = result.draggableId;
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      queryClient.setQueryData<InternalTask[]>(["internal-tasks"], (old) =>
        (old || []).map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      updateStatusMutation.mutate({ id: taskId, status: newStatus });
    },
    [tasks, queryClient, updateStatusMutation]
  );

  const handleQuickAction = useCallback(
    (taskId: string, newStatus: string, label: string) => {
      queryClient.setQueryData<InternalTask[]>(["internal-tasks"], (old) =>
        (old || []).map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: new Date().toISOString() } : t))
      );
      updateStatusMutation.mutate({ id: taskId, status: newStatus });
      toast.success(label);
    },
    [queryClient, updateStatusMutation]
  );

  const canRate = CAN_RATE_ROLES.includes(currentRole);

  const getRatingInfo = (taskId: string) => {
    const taskRatings = allRatings.filter((r) => r.task_id === taskId);
    if (taskRatings.length === 0) return { avg: 0, count: 0, myRating: 0 };
    const avg = taskRatings.reduce((s, r) => s + r.rating, 0) / taskRatings.length;
    const myRating = taskRatings.find((r) => r.user_id === user?.id)?.rating || 0;
    return { avg: Math.round(avg * 10) / 10, count: taskRatings.length, myRating };
  };

  const getInitials = (name: string | null) =>
    (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Only show active statuses on the board
  const activeTasks = tasks.filter((t) => ACTIVE_COLUMNS.some((c) => c.key === t.status));

  return (
    <AppLayout title="Tablica operacyjna">
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Zgłoś sprawę / pomysł
        </Button>
        <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
          <ArchiveIcon className="h-4 w-4 mr-1" /> Archiwum
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 h-[calc(100vh-10rem)] overflow-x-auto pb-4">
          {ACTIVE_COLUMNS.map((col, colIdx) => {
            const colTasks = activeTasks.filter((t) => t.status === col.key);
            const isFirst = colIdx === 0;
            const isLast = colIdx === ACTIVE_COLUMNS.length - 1;
            return (
              <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
                <div className={`rounded-t-lg px-3 py-1.5 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{col.key}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{colTasks.length}</Badge>
                  </div>
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <ScrollArea className={`flex-1 border border-t-0 border-border rounded-b-lg transition-colors ${snapshot.isDraggingOver ? "bg-accent/30" : "bg-card"}`}>
                      <div ref={provided.innerRef} {...provided.droppableProps} className="p-1.5 space-y-1.5 min-h-[60px]">
                        {colTasks.map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            ratingInfo={getRatingInfo(task.id)}
                            canRate={canRate}
                            onRate={(rating) => rateMutation.mutate({ taskId: task.id, rating })}
                            getInitials={getInitials}
                            isFirstColumn={isFirst}
                            isLastColumn={isLast}
                            onQuickAction={handleQuickAction}
                          />
                        ))}
                        {provided.placeholder}
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-xs text-muted-foreground text-center py-6">Brak zgłoszeń</p>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zgłoś sprawę / pomysł</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tytuł *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Np. Kupić papier do drukarki" />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Szczegóły..." rows={3} />
            </div>
            <div>
              <Label>Typ</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Zakupy", "Innowacja", "Usterka", "Inne"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anuluj</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newTitle.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Zapisywanie..." : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive drawer */}
      <OperationalArchiveDrawer open={archiveOpen} onOpenChange={setArchiveOpen} allRatings={allRatings} />
    </AppLayout>
  );
}

/* ── Task Card ── */
function TaskCard({
  task,
  index,
  ratingInfo,
  canRate,
  onRate,
  getInitials,
  isFirstColumn,
  isLastColumn,
  onQuickAction,
}: {
  task: InternalTask;
  index: number;
  ratingInfo: { avg: number; count: number; myRating: number };
  canRate: boolean;
  onRate: (rating: number) => void;
  getInitials: (n: string | null) => string;
  isFirstColumn: boolean;
  isLastColumn: boolean;
  onQuickAction: (taskId: string, status: string, label: string) => void;
}) {
  const [hoverStar, setHoverStar] = useState(0);
  const authorName = task.profiles?.full_name || "Nieznany";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`transition-shadow ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-sm"}`}
        >
          <CardContent className="p-2.5">
            {/* Type badge */}
            <Badge className={`text-[10px] h-4 mb-1.5 ${TYPE_COLORS[task.type] || TYPE_COLORS.Inne}`}>
              {task.type}
            </Badge>

            {/* Title */}
            <p className="text-sm font-medium text-foreground leading-tight mb-2">{task.title}</p>

            {/* Author */}
            <div className="flex items-center gap-1.5 mb-2">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-muted">{getInitials(authorName)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">{authorName}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[11px] text-muted-foreground truncate">{authorName}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1">
              {canRate ? (
                <div className="flex items-center" onMouseLeave={() => setHoverStar(0)}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 cursor-pointer transition-colors ${
                        (hoverStar || ratingInfo.myRating) >= s
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                      onMouseEnter={() => setHoverStar(s)}
                      onClick={(e) => { e.stopPropagation(); onRate(s); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        ratingInfo.avg >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground ml-1">
                {ratingInfo.count > 0
                  ? `${ratingInfo.avg} (${ratingInfo.count} ${ratingInfo.count === 1 ? "głos" : "głosy"})`
                  : "Brak oceny"}
              </span>
            </div>

            {/* Quick action buttons */}
            {(isFirstColumn || isLastColumn) && (
              <div className="mt-2 pt-2 border-t border-border">
                {isFirstColumn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-destructive w-full justify-start px-1"
                    onClick={(e) => { e.stopPropagation(); onQuickAction(task.id, "Odrzucone", "Zgłoszenie odrzucone"); }}
                  >
                    <Archive className="h-3 w-3 mr-1" /> Archiwizuj
                  </Button>
                )}
                {isLastColumn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 w-full justify-start px-1"
                    onClick={(e) => { e.stopPropagation(); onQuickAction(task.id, "Zakończone", "Zgłoszenie zakończone ✓"); }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Zakończ
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

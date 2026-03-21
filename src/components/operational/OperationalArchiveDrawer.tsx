import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface TaskRating {
  task_id: string;
  user_id: string;
  rating: number;
}

interface ArchivedTask {
  id: string;
  title: string;
  type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

const STATUS_BADGE: Record<string, string> = {
  Odrzucone: "bg-destructive/20 text-destructive",
  Zakończone: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

export function OperationalArchiveDrawer({
  open,
  onOpenChange,
  allRatings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allRatings: TaskRating[];
}) {
  const { data: archivedTasks = [] } = useQuery<ArchivedTask[]>({
    queryKey: ["internal-tasks-archive"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_tasks")
        .select("id, title, type, status, completed_at, created_at, profiles:created_by(full_name)")
        .in("status", ["Odrzucone", "Zakończone"])
        .order("completed_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as ArchivedTask[];
    },
  });

  const getAvg = (taskId: string) => {
    const r = allRatings.filter((x) => x.task_id === taskId);
    if (r.length === 0) return "—";
    const avg = r.reduce((s, x) => s + x.rating, 0) / r.length;
    return `${(Math.round(avg * 10) / 10).toFixed(1)} (${r.length})`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Archiwum operacyjne</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {archivedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Brak zarchiwizowanych zgłoszeń</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead className="w-20">Typ</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Autor</TableHead>
                  <TableHead className="w-20">Ocena</TableHead>
                  <TableHead className="w-24">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-sm">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{task.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_BADGE[task.status] || ""}`}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.profiles?.full_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {getAvg(task.id)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.completed_at
                        ? format(new Date(task.completed_at), "dd.MM.yy", { locale: pl })
                        : format(new Date(task.created_at), "dd.MM.yy", { locale: pl })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

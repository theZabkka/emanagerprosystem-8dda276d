import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  new: "Nowe", todo: "Do zrobienia", in_progress: "W trakcie", review: "Weryfikacja",
  corrections: "Poprawki", client_review: "Akceptacja klienta", done: "Gotowe", cancelled: "Anulowane",
};
const priorityLabels: Record<string, string> = { critical: "Pilny", high: "Wysoki", medium: "Średni", low: "Niski" };

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  return `${Math.floor(diff / 3600000)}h`;
}

interface TaskListViewProps {
  tasks: any[];
  isLoading: boolean;
}

export default function TaskListView({ tasks, isLoading }: TaskListViewProps) {
  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Zadanie</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Czas w statusie</TableHead>
            <TableHead>Priorytet</TableHead>
            <TableHead>Przypisano</TableHead>
            <TableHead>Termin</TableHead>
            <TableHead>Klient</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ładowanie...</TableCell></TableRow>
          ) : tasks.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Brak zadań</TableCell></TableRow>
          ) : (
            tasks.map((task: any) => {
              const assignee = task.task_assignments?.find((a: any) => a.role === "primary");
              return (
                <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/tasks/${task.id}`} className="block">
                      <p className="text-xs text-muted-foreground">{task.id.slice(0, 8)}</p>
                      <p className="font-medium text-sm">{task.title}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeSince(task.updated_at || task.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {priorityLabels[task.priority] || task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-muted">{assignee.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.profiles?.full_name}</span>
                      </div>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString("pl-PL") : "—"}</TableCell>
                  <TableCell className="text-sm">{task.clients?.name || "—"}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

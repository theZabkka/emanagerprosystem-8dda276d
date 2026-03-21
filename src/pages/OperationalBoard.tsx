import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLUMNS = [
  { key: "new", label: "Nowe", color: "bg-muted" },
  { key: "todo", label: "Do zrobienia", color: "bg-blue-500/10" },
  { key: "in_progress", label: "W trakcie", color: "bg-yellow-500/10" },
  { key: "review", label: "Weryfikacja", color: "bg-purple-500/10" },
  { key: "corrections", label: "Poprawki", color: "bg-destructive/10" },
  { key: "client_review", label: "Akceptacja klienta", color: "bg-indigo-500/10" },
  { key: "client_verified", label: "Zweryfikowane", color: "bg-emerald-500/10" },
  { key: "done", label: "Gotowe", color: "bg-green-500/10" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-muted text-muted-foreground",
};

export default function OperationalBoard() {
  const { data: tasks = [] } = useQuery({
    queryKey: ["board-tasks", isDemo],
    queryFn: async () => {
      if (isDemo) {
        return mockTasks.filter(t => (t.status as string) !== "cancelled").map(t => ({
          ...t,
          clients: mockClients.find(c => c.id === t.client_id) ? { name: mockClients.find(c => c.id === t.client_id)!.name } : null,
        }));
      }
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, type, client_id, clients:client_id(name)")
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout title="Tablica operacyjna">
      <div className="flex gap-4 h-[calc(100vh-8rem)] overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t: any) => t.status === col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
              <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 border border-t-0 border-border rounded-b-lg bg-card">
                <div className="p-2 space-y-2">
                  {columnTasks.map((task: any) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground line-clamp-2">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.priority && (
                            <Badge className={`text-[10px] h-5 ${PRIORITY_COLORS[task.priority] || ""}`}>
                              {task.priority === "critical" ? "PILNY" : task.priority === "high" ? "WYSOKI" : task.priority === "medium" ? "ŚREDNI" : "NISKI"}
                            </Badge>
                          )}
                          {task.type && (
                            <Badge variant="outline" className="text-[10px] h-5">{task.type}</Badge>
                          )}
                        </div>
                        {(task.clients as any)?.name && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {(task.clients as any).name}
                          </p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Termin: {new Date(task.due_date).toLocaleDateString("pl-PL")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak zadań</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

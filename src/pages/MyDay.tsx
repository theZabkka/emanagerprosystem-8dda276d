import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, CheckSquare, Clock, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function MyDay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: myTasks = [] } = useQuery({
    queryKey: ["my-day-tasks", user?.id],
    queryFn: async () => {

      if (!user) return [];
      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", user.id);
      const taskIds = (assignments || []).map((a) => a.task_id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, type, clients:client_id(name)")
        .in("id", taskIds)
        .not("status", "in", "(done,cancelled)")
        .order("priority")
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: todayLogs = [] } = useQuery({
    queryKey: ["my-day-logs", user?.id, today],
    queryFn: async () => {

      if (!user) return [];
      const { data } = await supabase
        .from("time_logs")
        .select("duration, description, tasks:task_id(title)")
        .eq("user_id", user.id)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      return data || [];
    },
    enabled: !!user,
  });

  const overdue = myTasks.filter((t: any) => t.due_date && t.due_date < today);
  const dueToday = myTasks.filter((t: any) => t.due_date === today);
  const inProgress = myTasks.filter((t: any) => t.status === "in_progress");
  const todayMinutes = todayLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);

  const priorityLabel: Record<string, string> = {
    critical: "PILNY", high: "WYSOKI", medium: "ŚREDNI", low: "NISKI",
  };
  const priorityColor: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-white",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <AppLayout title="Mój dzień">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sun className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
            </h2>
            <p className="text-sm text-muted-foreground">Twój przegląd dnia</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/tasks")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{myTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Otwartych zadań</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/tasks?filter=today")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{dueToday.length}</p>
                  <p className="text-sm text-muted-foreground">Na dziś</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => navigate("/tasks?filter=overdue")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
                  <p className="text-sm text-muted-foreground">Zaległe</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
                  </p>
                  <p className="text-sm text-muted-foreground">Zalogowano dziś</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue */}
        {overdue.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-base text-destructive">⚠️ Zaległe zadania</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdue.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-destructive/5">
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColor[t.priority] || ""}>{priorityLabel[t.priority] || t.priority}</Badge>
                      <span className="text-xs text-muted-foreground">Termin: {t.due_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* In progress */}
        <Card>
          <CardHeader><CardTitle className="text-base">W trakcie ({inProgress.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inProgress.length === 0 && <p className="text-sm text-muted-foreground">Brak zadań w trakcie</p>}
              {inProgress.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                    {(t.clients as any)?.name && (
                      <Badge variant="outline" className="text-[10px]">{(t.clients as any).name}</Badge>
                    )}
                  </div>
                  <Badge className={priorityColor[t.priority] || ""}>{priorityLabel[t.priority] || t.priority}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All my tasks */}
        <Card>
          <CardHeader><CardTitle className="text-base">Wszystkie moje zadania ({myTasks.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myTasks.length === 0 && <p className="text-sm text-muted-foreground">Brak przypisanych zadań</p>}
              {myTasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                    {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

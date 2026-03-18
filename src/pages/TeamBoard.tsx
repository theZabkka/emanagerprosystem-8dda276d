import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockProfiles, mockTasks, mockTaskAssignments } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Users, CheckSquare, Clock, AlertTriangle } from "lucide-react";

export default function TeamBoard() {
  const { isDemo } = useDataSource();
  const { data: profiles = [] } = useQuery({
    queryKey: ["team-profiles", isDemo],
    queryFn: async () => {
      if (isDemo) return mockProfiles.map(p => ({ id: p.id, full_name: p.full_name, role: p.role, department: p.department, avatar_url: p.avatar_url }));
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, department, avatar_url")
        .order("full_name");
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["team-tasks", isDemo],
    queryFn: async () => {
      if (isDemo) return mockTasks.filter(t => t.status !== "done" && (t.status as string) !== "cancelled");
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, created_by")
        .not("status", "in", "(done,cancelled)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["team-assignments", isDemo],
    queryFn: async () => {
      if (isDemo) return mockTaskAssignments;
      const { data } = await supabase
        .from("task_assignments")
        .select("task_id, user_id, role");
      return data || [];
    },
  });

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const getUserTasks = (userId: string) => {
    const userTaskIds = assignments.filter((a) => a.user_id === userId).map((a) => a.task_id);
    return tasks.filter((t) => userTaskIds.includes(t.id) || t.created_by === userId);
  };

  const getStatusCount = (userTasks: any[], status: string) =>
    userTasks.filter((t) => t.status === status).length;

  return (
    <AppLayout title="Tablica zespołu">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
                  <p className="text-sm text-muted-foreground">Członków zespołu</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                  <p className="text-sm text-muted-foreground">Otwartych zadań</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {tasks.filter((t) => t.status === "in_progress").length}
                  </p>
                  <p className="text-sm text-muted-foreground">W trakcie</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Zaległe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team members grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const userTasks = getUserTasks(p.id);
            const inProgress = getStatusCount(userTasks, "in_progress");
            const review = getStatusCount(userTasks, "review");
            const corrections = getStatusCount(userTasks, "corrections");
            const overdue = userTasks.filter(
              (t) => t.due_date && new Date(t.due_date) < new Date()
            ).length;

            return (
              <Card key={p.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(p.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.full_name || "—"}</p>
                      <div className="flex gap-1">
                        {p.role && <Badge variant="outline" className="text-[10px] h-4">{p.role}</Badge>}
                        {p.department && <Badge variant="secondary" className="text-[10px] h-4">{p.department}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{userTasks.length}</p>
                      <p className="text-[10px] text-muted-foreground">Zadań</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{inProgress}</p>
                      <p className="text-[10px] text-muted-foreground">W trakcie</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{review}</p>
                      <p className="text-[10px] text-muted-foreground">Review</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${overdue > 0 ? "text-destructive" : "text-foreground"}`}>{overdue}</p>
                      <p className="text-[10px] text-muted-foreground">Zaległe</p>
                    </div>
                  </div>
                  {corrections > 0 && (
                    <Badge variant="destructive" className="mt-3 text-xs">
                      {corrections} w poprawkach
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

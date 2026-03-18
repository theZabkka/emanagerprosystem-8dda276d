import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function ClientDashboard() {
  const { clientId } = useRole();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, description, start_date, end_date")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-summary", clientId],
    queryFn: async () => {
      if (!clientId) return { review: 0, done: 0 };
      const { data } = await supabase
        .from("tasks")
        .select("status")
        .eq("client_id", clientId)
        .in("status", ["client_review", "done"]);
      const review = data?.filter(t => t.status === "client_review").length || 0;
      const done = data?.filter(t => t.status === "done").length || 0;
      return { review, done };
    },
    enabled: !!clientId,
  });

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 border-emerald-400/50",
    completed: "bg-blue-500/15 text-blue-700 border-blue-400/50",
    paused: "bg-amber-500/15 text-amber-700 border-amber-400/50",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktywny",
    completed: "Zakończony",
    paused: "Wstrzymany",
  };

  return (
    <AppLayout title="Mój Dashboard">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Witaj, {profile?.full_name?.split(" ")[0] || "Kliencie"} 👋
          </h2>
          <p className="text-muted-foreground mt-1">
            Oto przegląd Twoich projektów i zadań.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Projektów</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks?.review || 0}</p>
                <p className="text-sm text-muted-foreground">Do akceptacji</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks?.done || 0}</p>
                <p className="text-sm text-muted-foreground">Zakończonych</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Twoje projekty</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="outline" className={statusColors[project.status || "active"] || ""}>
                        {statusLabels[project.status || "active"] || project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-0 text-primary">
                      Zobacz szczegóły <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nie masz jeszcze przypisanych projektów.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

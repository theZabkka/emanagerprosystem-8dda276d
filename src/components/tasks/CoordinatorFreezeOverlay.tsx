import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { AlertTriangle, Clock, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FREEZE_THRESHOLD_MS = 60 * 60 * 1000; // 60 min

export function CoordinatorFreezeOverlay() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [frozenTasks, setFrozenTasks] = useState<any[]>([]);

  // Fetch tasks currently in review with their status_entered_at from history
  const { data: reviewTasks } = useQuery({
    queryKey: ["review-tasks-freeze"],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_status_history")
        .select(`
          task_id,
          status_entered_at,
          tasks:task_id(
            id, title, priority, is_archived,
            clients:client_id(name),
            task_assignments(user_id, role, profiles:user_id(full_name))
          )
        `)
        .eq("new_status", "review")
        .is("status_exited_at", null);

      return (data || [])
        .map((h: any) => ({
          id: h.tasks?.id,
          title: h.tasks?.title,
          priority: h.tasks?.priority,
          is_archived: h.tasks?.is_archived,
          status_entered_at: h.status_entered_at,
          client_name: h.tasks?.clients?.name,
          assignees: (h.tasks?.task_assignments || []).map((a: any) => ({
            name: a.profiles?.full_name || "Nieznany",
            role: a.role,
          })),
        }))
        .filter((t: any) => t.id && !t.is_archived);
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  useEffect(() => {
    if (!reviewTasks) {
      setFrozenTasks([]);
      return;
    }
    const now = Date.now();
    const overdue = reviewTasks.filter((t: any) => {
      if (!t.status_entered_at) return false;
      return now - new Date(t.status_entered_at).getTime() >= FREEZE_THRESHOLD_MS;
    });
    setFrozenTasks(overdue);
  }, [reviewTasks]);

  // No frozen tasks → nothing to show
  if (frozenTasks.length === 0) return null;

  // superadmin and boss: show non-blocking banner only
  const isExempt = currentRole === "superadmin" || currentRole === "boss";
  // clients never see this
  if (currentRole === "klient") return null;

  function formatElapsed(enteredAt: string) {
    const mins = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return `${hours}h ${remainder}min`;
  }

  const priorityColors: Record<string, string> = {
    critical: "bg-destructive/15 text-destructive border-destructive/30",
    high: "bg-warning/15 text-warning-foreground border-warning/30",
    medium: "bg-muted text-muted-foreground border-border",
    low: "bg-muted text-muted-foreground border-border",
  };

  const priorityLabels: Record<string, string> = {
    critical: "Pilny",
    high: "Wysoki",
    medium: "Średni",
    low: "Niski",
  };

  // Non-blocking info banner for superadmin/boss
  if (isExempt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-bottom-4">
        <div className="bg-card border-2 border-warning/50 rounded-xl shadow-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm font-semibold">
              {frozenTasks.length} {frozenTasks.length === 1 ? "zadanie oczekuje" : "zadań oczekuje"} na weryfikację
            </p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {frozenTasks.map((t: any) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tasks/${t.id}`)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border p-2 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.client_name || "Brak klienta"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-warning">{formatElapsed(t.status_entered_at)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Blocking overlay for koordynator, specjalista, praktykant
  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border-2 border-destructive rounded-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-destructive mb-2">
              ⏳ Zaległa weryfikacja zadań
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Poniższe zadania zbyt długo oczekują na weryfikację (ponad 60 minut).
              Przejdź do zadania i zakończ review, aby odblokować system.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Zadania do weryfikacji ({frozenTasks.length}):
          </p>

          {frozenTasks.map((t: any) => (
            <div
              key={t.id}
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.client_name && (
                      <span className="text-xs text-muted-foreground">{t.client_name}</span>
                    )}
                    {t.priority && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${priorityColors[t.priority] || ""}`}
                      >
                        {priorityLabels[t.priority] || t.priority}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-destructive flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-bold">{formatElapsed(t.status_entered_at)}</span>
                </div>
              </div>

              {t.assignees.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    {t.assignees.map((a: any) => a.name).join(", ")}
                  </span>
                </div>
              )}

              <Button
                onClick={() => navigate(`/tasks?taskId=${t.id}`)}
                className="w-full gap-2"
                size="sm"
              >
                <ExternalLink className="h-4 w-4" />
                Przejdź do zadania i zweryfikuj
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Blokada zniknie automatycznie, gdy wszystkie zaległe zadania zostaną zweryfikowane lub zmienią status.
        </p>
      </div>
    </div>
  );
}

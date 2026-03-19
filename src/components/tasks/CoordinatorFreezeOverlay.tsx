import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useDataSource } from "@/hooks/useDataSource";
import { AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const FREEZE_THRESHOLD_MS = 60 * 60 * 1000; // 60 min

export function CoordinatorFreezeOverlay() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { isDemo } = useDataSource();
  const [frozenTasks, setFrozenTasks] = useState<any[]>([]);

  // Fetch tasks currently in review with their status_entered_at from history
  const { data: reviewTasks } = useQuery({
    queryKey: ["review-tasks-freeze", isDemo],
    queryFn: async () => {
      if (isDemo) return [];
      // Get open status history entries for review status (status_exited_at IS NULL)
      const { data } = await supabase
        .from("task_status_history")
        .select("task_id, status_entered_at, tasks:task_id(id, title, client_id, clients:client_id(name))")
        .eq("new_status", "review")
        .is("status_exited_at", null);
      return (data || []).map((h: any) => ({
        id: h.tasks?.id,
        title: h.tasks?.title,
        status_entered_at: h.status_entered_at,
        clients: h.tasks?.clients,
      })).filter((t: any) => t.id);
    },
    refetchInterval: 30000,
    enabled: !!user && (currentRole === "koordynator" || currentRole === "boss"),
  });

  useEffect(() => {
    if (!reviewTasks) { setFrozenTasks([]); return; }
    const now = Date.now();
    const overdue = reviewTasks.filter((t: any) => {
      if (!t.status_entered_at) return false;
      const elapsed = now - new Date(t.status_entered_at).getTime();
      return elapsed >= FREEZE_THRESHOLD_MS;
    });
    setFrozenTasks(overdue);
  }, [reviewTasks]);

  if (frozenTasks.length === 0 || currentRole === "klient") return null;
  if (currentRole !== "koordynator") return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border-2 border-destructive rounded-2xl shadow-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-destructive mb-2">🔒 Konto zamrożone</h2>
          <p className="text-sm text-muted-foreground">
            Masz zadania oczekujące na weryfikację dłużej niż 60 minut.
            Nie możesz wykonywać żadnych innych akcji dopóki nie zweryfikujesz zaległych zadań.
          </p>
        </div>
        <div className="space-y-2 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zaległe zadania:</p>
          {frozenTasks.map((t: any) => {
            const elapsed = Math.floor((Date.now() - new Date(t.status_entered_at).getTime()) / 60000);
            return (
              <Link
                key={t.id}
                to={`/tasks/${t.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors"
              >
                <Clock className="h-4 w-4 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.clients?.name}</p>
                </div>
                <span className="text-xs font-bold text-destructive">{elapsed} min</span>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Kliknij na zadanie, aby przejść do jego weryfikacji. Blokada zniknie automatycznie.
        </p>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { AlertTriangle, Clock, ExternalLink, User, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CoordinatorFreezeOverlay() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const {
    frozenTasks,
    activeLockedTaskId,
    setActiveLockedTaskId,
    isExempt,
    snoozeTask,
    isSnoozing,
  } = useVerificationLock();

  if (!user) return null;
  if (currentRole === "klient") return null;
  if (frozenTasks.length === 0) return null;

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

  // superadmin/boss: non-blocking banner
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

  // If actively locked on a task and user is ON that task page, hide overlay
  if (activeLockedTaskId) {
    return null; // NavigationLock handles blocking
  }

  // Full blocking overlay
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

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setActiveLockedTaskId(t.id);
                    navigate(`/tasks/${t.id}`);
                  }}
                  className="flex-1 gap-2"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Przejdź do zadania i zweryfikuj
                </Button>

                {/* Snooze button - only if not yet snoozed */}
                {(!t.verification_snooze_count || t.verification_snooze_count === 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSnoozing}
                    onClick={() => snoozeTask(t.id)}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <TimerOff className="h-4 w-4" />
                    Odłóż na 1h
                  </Button>
                )}
              </div>
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

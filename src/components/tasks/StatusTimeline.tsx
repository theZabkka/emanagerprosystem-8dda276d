import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { History, Clock, Timer, HelpCircle, CheckCircle2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  new: "NOWE", todo: "DO ZROBIENIA", in_progress: "W REALIZACJI", review: "WERYFIKACJA",
  corrections: "POPRAWKI", client_review: "DO AKCEPTACJI KLIENTA", client_verified: "ZWERYFIKOWANE",
  waiting_for_client: "OCZEKIWANIE NA KLIENTA", done: "GOTOWE", closed: "ZAMKNIĘTE", cancelled: "ANULOWANE",
};

const statusColors: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  corrections: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  client_review: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  client_verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  waiting_for_client: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300",
  cancelled: "bg-muted text-muted-foreground",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hours < 24) return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface StatusHistoryEntry {
  id: string;
  task_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  created_at: string;
  status_entered_at?: string | null;
  status_exited_at?: string | null;
  duration_seconds?: number | null;
  note?: string | null;
  profiles?: { full_name: string } | null;
}

interface StatusTimelineProps {
  statusHistory: StatusHistoryEntry[];
  currentStatus: string;
}

const TERMINAL_STATUSES = new Set(["closed", "done", "cancelled"]);

function LiveTimer({ enteredAt, currentStatus }: { enteredAt: string; currentStatus: string }) {
  const [elapsed, setElapsed] = useState(0);
  const isStopped = TERMINAL_STATUSES.has(currentStatus);

  useEffect(() => {
    if (isStopped) return;
    const start = new Date(enteredAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [enteredAt, isStopped]);

  if (isStopped) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Timer className="h-3 w-3" />
        Zakończone
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary animate-pulse">
      <Timer className="h-3 w-3" />
      trwa {formatDuration(elapsed)}
    </span>
  );
}

export function StatusTimeline({ statusHistory, currentStatus }: StatusTimelineProps) {
  // Sort chronologically (oldest first) for timeline display
  const sorted = [...statusHistory].sort(
    (a, b) => new Date(a.status_entered_at || a.created_at).getTime() - new Date(b.status_entered_at || b.created_at).getTime()
  );

  // Compute aggregates: total time per status
  const aggregates: Record<string, number> = {};
  const now = Date.now();
  sorted.forEach(h => {
    const status = h.new_status;
    let duration = h.duration_seconds || 0;
    if (!h.status_exited_at && h.status_entered_at) {
      // Currently open - calculate live duration
      duration = Math.floor((now - new Date(h.status_entered_at).getTime()) / 1000);
    }
    aggregates[status] = (aggregates[status] || 0) + duration;
  });

  const getPersonName = (h: StatusHistoryEntry) => {
    return h.profiles?.full_name || "?";
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <History className="h-4 w-4" />Historia statusów
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status live indicator */}
        {sorted.length > 0 && (() => {
          const current = sorted[sorted.length - 1];
          if (!current.status_exited_at && current.status_entered_at) {
            return (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <Badge className={`text-[10px] ${statusColors[current.new_status] || "bg-muted"}`}>
                  {statusLabels[current.new_status] || current.new_status}
                </Badge>
                <span className="text-xs text-muted-foreground">—</span>
                <LiveTimer enteredAt={current.status_entered_at} currentStatus={currentStatus} />
              </div>
            );
          }
          return null;
        })()}

        {/* Timeline entries */}
        {sorted.length > 0 ? (
          <div className="space-y-3">
            {sorted.map((h, i) => {
              const isOpen = !h.status_exited_at;
              const personName = getPersonName(h);
              return (
                <div key={h.id} className="flex items-start gap-3 relative">
                  {i < sorted.length - 1 && (
                    <div className="absolute left-[11px] top-6 w-px h-full bg-border" />
                  )}
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isOpen ? "bg-primary/20 ring-2 ring-primary/40" : "bg-primary/10"
                  }`}>
                    <Clock className={`h-3 w-3 ${isOpen ? "text-primary" : "text-primary/60"}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <Badge className={`text-[9px] ${statusColors[h.old_status] || "bg-muted"}`}>
                        {statusLabels[h.old_status] || h.old_status || "—"}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className={`text-[9px] ${statusColors[h.new_status] || "bg-muted"}`}>
                        {statusLabels[h.new_status] || h.new_status}
                      </Badge>
                      {h.duration_seconds != null && !isOpen && (
                        <span className="text-xs font-medium text-foreground/70 ml-1">
                          ⏱ {formatDuration(h.duration_seconds)}
                        </span>
                      )}
                      {isOpen && h.status_entered_at && (
                        <LiveTimer enteredAt={h.status_entered_at} currentStatus={currentStatus} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                          {getInitials(personName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{personName}</span>
                      <span>•</span>
                      <span>{formatDateTime(h.status_entered_at || h.created_at)}</span>
                      {h.status_exited_at && (
                        <>
                          <span>→</span>
                          <span>{formatDateTime(h.status_exited_at)}</span>
                        </>
                      )}
                    </div>
                    {h.note && (
                      <p className="text-xs text-muted-foreground italic">{h.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Brak historii statusów.</p>
        )}

        {/* Aggregates */}
        {Object.keys(aggregates).length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Łączny czas w statusach
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(aggregates)
                .sort(([, a], [, b]) => b - a)
                .map(([status, seconds]) => (
                  <div key={status} className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/50">
                    <Badge className={`text-[9px] ${statusColors[status] || "bg-muted"}`}>
                      {statusLabels[status] || status}
                    </Badge>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {formatDuration(seconds)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

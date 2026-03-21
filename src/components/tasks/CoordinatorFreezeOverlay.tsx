import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useDataSource } from "@/hooks/useDataSource";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { AlertTriangle, Clock, UserPlus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FREEZE_THRESHOLD_MS = 60 * 60 * 1000; // 60 min

export function CoordinatorFreezeOverlay() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { isDemo } = useDataSource();
  const queryClient = useQueryClient();
  const [frozenTasks, setFrozenTasks] = useState<any[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  // Fetch staff profiles for assignment dropdown (shared hook)
  const { data: staffProfiles, isLoading: loadingStaff, isError: staffError } = useStaffMembers();

  // Fetch tasks currently in review with their status_entered_at from history
  const { data: reviewTasks, refetch } = useQuery({
    queryKey: ["review-tasks-freeze", isDemo],
    queryFn: async () => {
      if (isDemo) return [];
      const { data } = await supabase
        .from("task_status_history")
        .select("task_id, status_entered_at, tasks:task_id(id, title, client_id, clients:client_id(name), task_assignments(user_id, role))")
        .eq("new_status", "review")
        .is("status_exited_at", null);
      return (data || []).map((h: any) => ({
        id: h.tasks?.id,
        title: h.tasks?.title,
        status_entered_at: h.status_entered_at,
        clients: h.tasks?.clients,
        task_assignments: h.tasks?.task_assignments || [],
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

  async function handleAssign(taskId: string) {
    const userId = selectedUsers[taskId];
    if (!userId) {
      toast.error("Wybierz osobę do przypisania");
      return;
    }

    setAssigning(taskId);
    try {
      if (isDemo) {
        toast.success("Zadanie przypisane (demo)");
        setFrozenTasks(prev => prev.filter(t => t.id !== taskId));
        setExpandedTaskId(null);
        setAssigning(null);
        return;
      }

      const { error } = await supabase
        .from("task_assignments")
        .insert({ task_id: taskId, user_id: userId, role: "primary" as any });

      if (error) {
        // If duplicate, try upsert approach
        if (error.code === "23505") {
          toast.info("Ta osoba jest już przypisana do tego zadania");
        } else {
          throw error;
        }
      } else {
        toast.success("Zadanie przypisane pomyślnie");
      }

      // Refresh data
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setExpandedTaskId(null);
      setSelectedUsers(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    } catch (err: any) {
      toast.error("Błąd przypisania: " + (err.message || "Spróbuj ponownie"));
    } finally {
      setAssigning(null);
    }
  }

  if (frozenTasks.length === 0 || currentRole === "klient") return null;
  // superadmin is never blocked by freeze overlay
  if (currentRole === "superadmin") return null;
  if (currentRole !== "koordynator" && currentRole !== "boss") return null;

  const canAssign = currentRole === "boss" || currentRole === "koordynator";

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border-2 border-destructive rounded-2xl shadow-2xl p-8 text-center space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-destructive mb-2">🔒 Konto zamrożone</h2>
          <p className="text-sm text-muted-foreground">
            Masz zadania oczekujące na weryfikację dłużej niż 60 minut.
            {canAssign
              ? " Przypisz osoby do zadań lub zweryfikuj zaległe zadania, aby odblokować system."
              : " Skontaktuj się z koordynatorem, aby odblokować system."}
          </p>
        </div>
        <div className="space-y-3 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Zaległe zadania ({frozenTasks.length}):
          </p>
          {frozenTasks.map((t: any) => {
            const elapsed = Math.floor((Date.now() - new Date(t.status_entered_at).getTime()) / 60000);
            const isExpanded = expandedTaskId === t.id;
            const hasAssignment = t.task_assignments && t.task_assignments.length > 0;

            return (
              <div
                key={t.id}
                className="rounded-lg bg-destructive/5 border border-destructive/20 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-destructive/10 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{t.clients?.name}</p>
                      {!hasAssignment && (
                        <span className="text-xs font-medium text-destructive flex items-center gap-1">
                          <UserPlus className="h-3 w-3" /> Nieprzypisane
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-destructive whitespace-nowrap">{elapsed} min</span>
                  {canAssign && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && canAssign && (
                  <div className="px-4 pb-4 pt-1 border-t border-destructive/10 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Przypisz osobę odpowiedzialną, aby odblokować dalszą pracę nad tym zadaniem.
                    </p>
                    {loadingStaff ? (
                      <p className="text-xs text-muted-foreground">Ładowanie pracowników...</p>
                    ) : staffError ? (
                      <p className="text-xs text-destructive">Nie udało się pobrać listy pracowników</p>
                    ) : !staffProfiles || staffProfiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Brak dostępnych pracowników do przypisania</p>
                    ) : (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-foreground mb-1 block">
                            Wybierz osobę:
                          </label>
                          <Select
                            value={selectedUsers[t.id] || ""}
                            onValueChange={(val) => setSelectedUsers(prev => ({ ...prev, [t.id]: val }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Wybierz pracownika..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffProfiles.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name || p.email || "Bez nazwy"} ({p.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAssign(t.id)}
                          disabled={!selectedUsers[t.id] || assigning === t.id}
                          className="gap-1"
                        >
                          {assigning === t.id ? (
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Przypisz
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && !canAssign && (
                  <div className="px-4 pb-4 pt-1 border-t border-destructive/10">
                    <p className="text-xs text-muted-foreground">
                      To zadanie wymaga przypisania przez koordynatora lub przełożonego.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {canAssign
            ? "Rozwiń zadanie, aby przypisać osobę. Blokada zniknie automatycznie po obsłużeniu wszystkich zaległości."
            : "Blokada zniknie automatycznie po obsłużeniu zaległych zadań."}
        </p>
      </div>
    </div>
  );
}

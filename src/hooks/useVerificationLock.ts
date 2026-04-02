import { create } from "zustand";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

const FREEZE_THRESHOLD_MS = 60 * 60 * 1000; // 60 min

interface VerificationLockState {
  activeLockedTaskId: string | null;
  setActiveLockedTaskId: (id: string | null) => void;
}

export const useVerificationLockStore = create<VerificationLockState>((set) => ({
  activeLockedTaskId: null,
  setActiveLockedTaskId: (id) => set({ activeLockedTaskId: id }),
}));

export function useVerificationLock() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const { activeLockedTaskId, setActiveLockedTaskId } = useVerificationLockStore();

  const isExempt = currentRole === "superadmin" || currentRole === "boss" || currentRole === "klient";

  // Fetch ALL review tasks (for banner count) - includes snoozed
  const { data: allReviewTasks = [] } = useQuery({
    queryKey: ["all-review-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_status_history")
        .select(`
          task_id,
          status_entered_at,
          tasks:task_id(
            id, title, priority, is_archived,
            verification_snoozed_until, verification_snooze_count,
            clients:client_id(name),
            task_assignments(user_id, role, profiles:user_id(full_name))
          )
        `)
        .eq("new_status", "review")
        .is("status_exited_at", null);

      const now = Date.now();
      return (data || [])
        .map((h: any) => ({
          id: h.tasks?.id,
          title: h.tasks?.title,
          priority: h.tasks?.priority,
          is_archived: h.tasks?.is_archived,
          status_entered_at: h.status_entered_at,
          client_name: h.tasks?.clients?.name,
          verification_snoozed_until: h.tasks?.verification_snoozed_until,
          verification_snooze_count: h.tasks?.verification_snooze_count || 0,
          assignees: (h.tasks?.task_assignments || []).map((a: any) => ({
            name: a.profiles?.full_name || "Nieznany",
            role: a.role,
          })),
        }))
        .filter((t: any) => {
          if (!t.id || t.is_archived) return false;
          if (!t.status_entered_at) return false;
          return now - new Date(t.status_entered_at).getTime() >= FREEZE_THRESHOLD_MS;
        });
    },
    refetchInterval: 30000,
    enabled: !!user && !isExempt,
  });

  // Blocking tasks = review tasks that are NOT currently snoozed
  const frozenTasks = allReviewTasks.filter((t: any) => {
    if (!t.verification_snoozed_until) return true;
    return new Date(t.verification_snoozed_until).getTime() < Date.now();
  });

  const hasPendingVerifications = !isExempt && frozenTasks.length > 0;

  // If the active locked task is no longer in the frozen list, clear it
  useEffect(() => {
    if (activeLockedTaskId && frozenTasks.length > 0) {
      const stillFrozen = frozenTasks.some((t: any) => t.id === activeLockedTaskId);
      if (!stillFrozen) {
        setActiveLockedTaskId(null);
      }
    }
    if (frozenTasks.length === 0 && activeLockedTaskId) {
      setActiveLockedTaskId(null);
    }
  }, [frozenTasks, activeLockedTaskId, setActiveLockedTaskId]);

  const refreshAfterVerification = async () => {
    await queryClient.invalidateQueries({ queryKey: ["all-review-tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["verification-lock-tasks"] });
  };

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("tasks")
        .update({
          verification_snoozed_until: snoozeUntil,
          verification_snooze_count: 1,
        } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Weryfikacja odłożona na 1 godzinę");
      await refreshAfterVerification();
    },
    onError: (err: any) => {
      toast.error("Nie udało się odłożyć weryfikacji: " + err.message);
    },
  });

  return {
    hasPendingVerifications,
    frozenTasks,
    allReviewTasks,
    activeLockedTaskId,
    setActiveLockedTaskId,
    isExempt,
    refreshAfterVerification,
    snoozeTask: snoozeMutation.mutateAsync,
    isSnoozePending: snoozeMutation.isPending,
  };
}

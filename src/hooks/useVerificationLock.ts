import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

const FREEZE_THRESHOLD_MS = 60 * 60 * 1000; // 60 min
const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 min (test)

interface VerificationLockState {
  activeLockedTaskId: string | null;
  setActiveLockedTaskId: (id: string | null) => void;
  snoozedUntil: number | null; // epoch ms
  snoozeUsed: boolean;
  activateSnooze: () => void;
  cancelSnooze: () => void;
}

export const useVerificationLockStore = create<VerificationLockState>()(
  persist(
    (set) => ({
      activeLockedTaskId: null,
      setActiveLockedTaskId: (id) => set({ activeLockedTaskId: id }),
      snoozedUntil: null,
      snoozeUsed: false,
      activateSnooze: () =>
        set({
          snoozedUntil: Date.now() + SNOOZE_DURATION_MS,
          snoozeUsed: true,
          activeLockedTaskId: null,
        }),
      cancelSnooze: () => set({ snoozedUntil: null }),
    }),
    {
      name: "verification-lock-storage",
      partialize: (state) => ({
        snoozedUntil: state.snoozedUntil,
        snoozeUsed: state.snoozeUsed,
      }),
    }
  )
);

export function useVerificationLock() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const {
    activeLockedTaskId,
    setActiveLockedTaskId,
    snoozedUntil,
    snoozeUsed,
    activateSnooze,
    cancelSnooze,
  } = useVerificationLockStore();

  const isExempt =
    currentRole === "superadmin" ||
    currentRole === "boss" ||
    currentRole === "klient";

  const { data: frozenTasks = [], refetch } = useQuery({
    queryKey: ["verification-lock-tasks"],
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

      const now = Date.now();
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
        .filter((t: any) => {
          if (!t.id || t.is_archived) return false;
          if (!t.status_entered_at) return false;
          return now - new Date(t.status_entered_at).getTime() >= FREEZE_THRESHOLD_MS;
        });
    },
    refetchInterval: 30000,
    staleTime: 60 * 1000,
    enabled: !!user && !isExempt,
  });

  const isSnoozed = useMemo(() => {
    if (!snoozedUntil) return false;
    return Date.now() < snoozedUntil;
  }, [snoozedUntil]);

  const snoozeRemainingMs = useMemo(() => {
    if (!snoozedUntil) return 0;
    return Math.max(0, snoozedUntil - Date.now());
  }, [snoozedUntil]);

  const hasPendingVerifications = !isExempt && frozenTasks.length > 0;

  // Hard block only when not snoozed
  const isHardBlocked = hasPendingVerifications && !isSnoozed;

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

  // Reset snoozeUsed when all tasks are resolved
  useEffect(() => {
    if (frozenTasks.length === 0 && snoozeUsed) {
      useVerificationLockStore.setState({ snoozeUsed: false, snoozedUntil: null });
    }
  }, [frozenTasks.length, snoozeUsed]);

  // Auto-expire snooze: cancel when time runs out
  useEffect(() => {
    if (!snoozedUntil) return;
    const remaining = snoozedUntil - Date.now();
    if (remaining <= 0) {
      cancelSnooze();
      return;
    }
    const timer = setTimeout(() => {
      cancelSnooze();
      // Force refetch to re-evaluate
      refetch();
    }, remaining);
    return () => clearTimeout(timer);
  }, [snoozedUntil, cancelSnooze, refetch]);

  const refreshAfterVerification = async () => {
    await queryClient.invalidateQueries({ queryKey: ["verification-lock-tasks"] });
    await refetch();
  };

  return {
    hasPendingVerifications,
    frozenTasks,
    activeLockedTaskId,
    setActiveLockedTaskId,
    isExempt,
    refreshAfterVerification,
    isSnoozed,
    snoozeRemainingMs,
    snoozeUsed,
    activateSnooze,
    cancelSnooze,
    isHardBlocked,
  };
}

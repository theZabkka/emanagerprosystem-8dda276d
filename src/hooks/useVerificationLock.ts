import { create } from "zustand";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

const FREEZE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min
const SNOOZE_DURATION_MS = 1 * 60 * 1000; // 1 min

const SNOOZE_STORAGE_KEY = "verification-snooze";

function loadSnoozeState(): { snoozedUntil: number | null; hasUsedSnooze: boolean } {
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { snoozedUntil: null, hasUsedSnooze: false };
}

function saveSnoozeState(state: { snoozedUntil: number | null; hasUsedSnooze: boolean }) {
  localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(state));
}

interface VerificationLockState {
  activeLockedTaskId: string | null;
  setActiveLockedTaskId: (id: string | null) => void;
  snoozedUntil: number | null;
  hasUsedSnooze: boolean;
  activateSnooze: () => void;
  clearSnooze: () => void;
  resetSnoozeFlag: () => void;
}

export const useVerificationLockStore = create<VerificationLockState>((set) => {
  const initial = loadSnoozeState();
  return {
    activeLockedTaskId: null,
    setActiveLockedTaskId: (id) => set({ activeLockedTaskId: id }),
    snoozedUntil: initial.snoozedUntil,
    hasUsedSnooze: initial.hasUsedSnooze,
    activateSnooze: () =>
      set(() => {
        const state = { snoozedUntil: Date.now() + SNOOZE_DURATION_MS, hasUsedSnooze: true };
        saveSnoozeState(state);
        return state;
      }),
    clearSnooze: () =>
      set((prev) => {
        const state = { snoozedUntil: null, hasUsedSnooze: prev.hasUsedSnooze };
        saveSnoozeState(state);
        return state;
      }),
    resetSnoozeFlag: () =>
      set(() => {
        const state = { snoozedUntil: null, hasUsedSnooze: false };
        saveSnoozeState(state);
        return state;
      }),
  };
});

export function useVerificationLock() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const {
    activeLockedTaskId, setActiveLockedTaskId,
    snoozedUntil, hasUsedSnooze,
    activateSnooze, clearSnooze, resetSnoozeFlag,
  } = useVerificationLockStore();

  const isExempt = currentRole === "superadmin" || currentRole === "boss" || currentRole === "klient";

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
    refetchInterval: 15000,
    staleTime: 10000,
    enabled: !!user && !isExempt,
  });

  const hasPendingVerifications = !isExempt && frozenTasks.length > 0;

  // Snooze active?
  const isSnoozed = !!(snoozedUntil && Date.now() < snoozedUntil);

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

  // When all frozen tasks are resolved, reset snooze flag for next cycle
  useEffect(() => {
    if (frozenTasks.length === 0 && hasUsedSnooze) {
      resetSnoozeFlag();
    }
  }, [frozenTasks.length, hasUsedSnooze, resetSnoozeFlag]);

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
    snoozedUntil,
    hasUsedSnooze,
    activateSnooze,
    clearSnooze,
  };
}

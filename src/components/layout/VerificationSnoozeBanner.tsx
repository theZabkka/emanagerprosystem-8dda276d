import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationLock } from "@/hooks/useVerificationLock";

export function VerificationSnoozeBanner() {
  const {
    hasPendingVerifications,
    isSnoozed,
    snoozeRemainingMs,
    cancelSnooze,
    frozenTasks,
    setActiveLockedTaskId,
    isExempt,
  } = useVerificationLock();

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!isSnoozed) return;

    const tick = () => {
      const remaining = Math.max(0, snoozeRemainingMs - (Date.now() - Date.now()));
      // Recalculate from store
      const store = (window as any).__vLockStore;
      const snoozedUntil = store?.getState?.()?.snoozedUntil;
      if (!snoozedUntil) {
        setCountdown("");
        return;
      }
      const ms = Math.max(0, snoozedUntil - Date.now());
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isSnoozed, snoozeRemainingMs]);

  if (!hasPendingVerifications || !isSnoozed || isExempt) return null;

  return (
    <div className="bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center gap-3 text-sm font-medium z-50 relative">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Masz {frozenTasks.length} {frozenTasks.length === 1 ? "zaległe zadanie" : "zaległych zadań"} oczekujących na weryfikację. Możesz je sprawdzić w dowolnej chwili.{" "}
        {countdown && (
          <span className="font-bold">(Wymuszenie za {countdown})</span>
        )}
      </span>
      <Button
        size="sm"
        className="bg-yellow-900 hover:bg-yellow-800 text-yellow-50 h-7 text-xs"
        onClick={() => {
          cancelSnooze();
          // The modal will re-appear automatically via isHardBlocked
        }}
      >
        Zacznij Weryfikację
      </Button>
    </div>
  );
}

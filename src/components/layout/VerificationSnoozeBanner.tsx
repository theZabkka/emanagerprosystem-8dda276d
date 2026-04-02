import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerificationLock, useVerificationLockStore } from "@/hooks/useVerificationLock";

export function VerificationSnoozeBanner() {
  const {
    hasPendingVerifications,
    isSnoozed,
    cancelSnooze,
    frozenTasks,
    isExempt,
  } = useVerificationLock();

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!isSnoozed) {
      setCountdown("");
      return;
    }

    const tick = () => {
      const snoozedUntil = useVerificationLockStore.getState().snoozedUntil;
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
  }, [isSnoozed]);

  if (!hasPendingVerifications || !isSnoozed || isExempt) return null;

  return (
    <div className="bg-[hsl(45,100%,51%)] text-[hsl(45,100%,10%)] px-4 py-2 flex items-center gap-3 text-sm font-medium z-50 relative">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Masz {frozenTasks.length} {frozenTasks.length === 1 ? "zaległe zadanie" : "zaległych zadań"} oczekujących na weryfikację. Możesz je sprawdzić w dowolnej chwili.{" "}
        {countdown && (
          <span className="font-bold">(Wymuszenie za {countdown})</span>
        )}
      </span>
      <Button
        size="sm"
        className="bg-[hsl(45,100%,10%)] hover:bg-[hsl(45,100%,15%)] text-[hsl(45,100%,90%)] h-7 text-xs"
        onClick={cancelSnooze}
      >
        Zacznij Weryfikację
      </Button>
    </div>
  );
}

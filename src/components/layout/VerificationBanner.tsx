import { useNavigate } from "react-router-dom";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useRole } from "@/hooks/useRole";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationBanner() {
  const { totalReviewCount, allReviewTasks, isExempt } = useVerificationLock();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  // Only show for coordinators (non-exempt, non-client)
  if (isExempt || currentRole === "klient") return null;
  if (totalReviewCount <= 0) return null;

  const firstTask = allReviewTasks[0];

  return (
    <div className="bg-amber-500/90 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1">
        Masz <strong>{totalReviewCount}</strong>{" "}
        {totalReviewCount === 1 ? "zadanie oczekujące" : "zadań oczekujących"} na weryfikację.
        Możesz je sprawdzić w dowolnej chwili.
      </span>
      {firstTask && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          onClick={() => navigate(`/tasks/${firstTask.id}`)}
        >
          Sprawdź zadania
        </Button>
      )}
    </div>
  );
}

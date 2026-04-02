import { useNavigate } from "react-router-dom";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useRole } from "@/hooks/useRole";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationBanner() {
  const { allReviewTasks, isExempt } = useVerificationLock();
  const { currentRole, isClient } = useRole();
  const navigate = useNavigate();

  // Only show for coordinators (non-exempt, non-client roles)
  if (isExempt || isClient) return null;
  if (!allReviewTasks || allReviewTasks.length === 0) return null;

  const firstTask = allReviewTasks[0];

  return (
    <div className="mx-6 mt-4">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-warning/10 border-warning/30 text-warning-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <span className="text-sm flex-1">
          Masz <strong>{allReviewTasks.length}</strong>{" "}
          {allReviewTasks.length === 1 ? "zadanie oczekujące" : "zadań oczekujących"} na weryfikację.
          Możesz je sprawdzić w dowolnej chwili.
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => navigate(`/tasks/${firstTask.id}`)}
        >
          Sprawdź zadanie <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useVerificationLock } from "@/hooks/useVerificationLock";
import { useRole } from "@/hooks/useRole";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationBanner() {
  const { allReviewTasks, isExempt } = useVerificationLock();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  // Only show for coordinators (not exempt roles, not clients)
  if (isExempt || currentRole === "klient") return null;
  if (allReviewTasks.length === 0) return null;

  const firstTask = allReviewTasks[0];

  return (
    <div className="bg-warning/15 border-b border-warning/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
        <p className="text-sm font-medium text-warning-foreground truncate">
          Masz {allReviewTasks.length}{" "}
          {allReviewTasks.length === 1 ? "zadanie oczekujące" : "zadań oczekujących"} na
          weryfikację. Możesz je sprawdzić w dowolnej chwili.
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="flex-shrink-0 gap-1.5"
        onClick={() => navigate(`/tasks/${firstTask.id}`)}
      >
        Sprawdź zadanie
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

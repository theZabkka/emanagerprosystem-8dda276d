import { AlertCircle, Clock, Eye, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MisunderstoodTask {
  id: string;
  not_understood_at: string | null;
}

interface TaskAlertBannersProps {
  unassignedCount: number;
  reviewCount: number;
  clientReviewCount: number;
  notUnderstoodCount?: number;
  misunderstoodTasks?: MisunderstoodTask[];
  onFilterStatus: (status: string) => void;
}

export function TaskAlertBanners({ unassignedCount, reviewCount, clientReviewCount, notUnderstoodCount = 0, misunderstoodTasks = [], onFilterStatus }: TaskAlertBannersProps) {
  const navigate = useNavigate();

  function handleMisunderstoodClick() {
    if (misunderstoodTasks.length === 0) return;
    const sorted = [...misunderstoodTasks].sort((a, b) => {
      const dateA = a.not_understood_at ? new Date(a.not_understood_at).getTime() : 0;
      const dateB = b.not_understood_at ? new Date(b.not_understood_at).getTime() : 0;
      return dateA - dateB;
    });
    navigate(`/tasks/${sorted[0].id}`);
  }

  return (
    <>
      {notUnderstoodCount > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-amber-500 text-white">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              {notUnderstoodCount === 1
                ? "1 zadanie zgłoszone jako niezrozumiałe — wymagana akcja koordynatora."
                : `${notUnderstoodCount} zadań zgłoszonych jako niezrozumiałe — wymagana akcja koordynatora.`}
            </span>
          </div>
          <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={handleMisunderstoodClick}>
            {notUnderstoodCount === 1 ? "Przejdź do zadania" : "Przejdź do najstarszego"}
          </Button>
        </div>
      )}
      {unassignedCount > 0 && (
        <div className="flex items-center px-5 py-3 rounded-xl bg-destructive text-destructive-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">{unassignedCount} zadań nieprzypisanych — wymagają natychmiastowego przypisania osoby odpowiedzialnej.</span>
          </div>
        </div>
      )}
      {reviewCount > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-warning text-warning-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="font-semibold text-sm">{reviewCount} oczekuje na weryfikację.</span>
          </div>
          <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={() => onFilterStatus("review")}>Zweryfikuj</Button>
        </div>
      )}
      {clientReviewCount > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-warning text-warning-foreground">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span className="font-semibold text-sm">{clientReviewCount} czeka na akceptację klienta.</span>
          </div>
          <Button variant="secondary" size="sm" className="text-xs font-medium" onClick={() => onFilterStatus("client_review")}>Zobacz</Button>
        </div>
      )}
    </>
  );
}

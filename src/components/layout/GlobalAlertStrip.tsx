import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { AlertCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertCounts {
  unassigned: number;
  review: number;
  clientReview: number;
}

async function fetchAlertCounts(): Promise<AlertCounts> {
  const [unassignedRes, reviewRes, clientReviewRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .not("status", "in", '("done","closed","cancelled")')
      .is("accepted_responsibility_by", null)
      .eq("not_understood", false),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("status", "review"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("status", "client_review"),
  ]);

  // For unassigned: tasks with no task_assignments rows
  // We approximate by checking accepted_responsibility_by is null
  // which indicates no one has taken ownership

  return {
    unassigned: unassignedRes.count ?? 0,
    review: reviewRes.count ?? 0,
    clientReview: clientReviewRes.count ?? 0,
  };
}

const MANAGER_ROLES = new Set(["superadmin", "boss", "koordynator"]);

export function GlobalAlertStrip() {
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prevReviewRef = useRef<number | null>(null);

  const isManager = MANAGER_ROLES.has(currentRole);

  const { data } = useQuery({
    queryKey: ["global-alert-counts"],
    queryFn: fetchAlertCounts,
    refetchInterval: 15_000,
    enabled: isManager,
  });

  // Realtime invalidation
  useEffect(() => {
    if (!isManager) return;

    const channel = supabase
      .channel("global-alerts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["global-alert-counts"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isManager, queryClient]);

  // Sound on new review tasks
  useEffect(() => {
    if (!data) return;
    const prev = prevReviewRef.current;
    if (prev !== null && data.review > prev) {
      try {
        const audio = new Audio("/sounds/review-alert.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
    prevReviewRef.current = data.review;
  }, [data?.review]);

  if (!isManager || !data) return null;

  const { unassigned, review, clientReview } = data;
  if (unassigned === 0 && review === 0 && clientReview === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {unassigned > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{unassigned} zadań nieprzypisanych — wymagają natychmiastowego przypisania.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs font-semibold shrink-0"
            onClick={() => navigate("/tasks?unassigned=true")}
          >
            Pokaż
          </Button>
        </div>
      )}

      {review > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-500 text-yellow-950 text-sm font-semibold animate-alert-pulse">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{review} czeka na weryfikację!</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs font-semibold bg-yellow-900 text-yellow-100 hover:bg-yellow-800 border-0 shrink-0"
            onClick={() => navigate("/tasks?status=review")}
          >
            Zweryfikuj
          </Button>
        </div>
      )}

      {clientReview > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-orange-500 text-orange-950 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0" />
            <span>{clientReview} czeka na akceptację klienta.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs font-semibold shrink-0"
            onClick={() => navigate("/tasks?status=client_review")}
          >
            Zobacz
          </Button>
        </div>
      )}
    </div>
  );
}

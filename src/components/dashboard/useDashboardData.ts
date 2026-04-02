import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PIPELINE_STAGES = [
  { label: "Potencjalny", key: "potential", color: "bg-muted" },
  { label: "Kontakt", key: "contact", color: "bg-info/20" },
  { label: "Oferta wysłana", key: "offer_sent", color: "bg-warning/20" },
  { label: "Negocjacje", key: "negotiations", color: "bg-primary/20" },
  { label: "Wygrane", key: "won", color: "bg-success/20" },
  { label: "Przegrane", key: "lost", color: "bg-destructive/20" },
];

const EMPTY_PIPELINE = PIPELINE_STAGES.map((s) => ({ ...s, value: "0 zł", count: 0 }));

export function useDashboardData() {
  const queryClient = useQueryClient();

  const { data: clientCount } = useQuery({
    queryKey: ["clients-count"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: activeClientCount } = useQuery({
    queryKey: ["clients-active-count"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      return count || 0;
    },
  });

  const { data: allDashboardTasks } = useQuery({
    queryKey: ["dashboard-tasks-combined"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, is_archived, client_id, clients:client_id(name), task_assignments(task_id)",
        )
        .eq("is_archived", false)
        .limit(1000);
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minuta — dashboard może mieć lekko opóźnione dane
  });

  // Wylicz wszystkie metryki z jednego zestawu danych:
  const today = new Date().toISOString().split("T")[0];
  const activeTasks = (allDashboardTasks || []).filter(
    (t) => !["done", "closed", "cancelled"].includes(t.status || ""),
  );
  const overdue = activeTasks.filter((t) => t.due_date && t.due_date < today).length;
  const corrections = (allDashboardTasks || []).filter((t) => t.status === "corrections").length;
  const clientReview = (allDashboardTasks || []).filter((t) => t.status === "client_review").length;
  const clientReviewTasks = (allDashboardTasks || []).filter((t) => t.status === "client_review");
  const correctionTasks = (allDashboardTasks || []).filter((t) => t.status === "corrections");
  const unassignedTasks = activeTasks.filter((t) => {
    const title = t.title;
    return typeof title === "string" && title.trim().length > 0 && (t.task_assignments || []).length === 0;
  }).length;

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["recent-activity"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Try activity_log first
      const { data: logs } = await supabase
        .from("activity_log")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (logs && logs.length > 0) return logs;

      // Fallback: recent task updates
      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("id, title, updated_at, status, created_by, profiles:created_by(full_name)")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(8);

      return (recentTasks || []).map((t: any) => ({
        id: t.id,
        action: `zaktualizowano zadanie (${t.status})`,
        entity_name: t.title,
        created_at: t.updated_at,
        profiles: t.profiles,
      }));
    },
  });

  const { data: pipelineDeals } = useQuery({
    queryKey: ["dashboard-pipeline"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_deals").select("stage, value");
      return data || [];
    },
  });

  const { data: unreadBugsCount } = useQuery({
    queryKey: ["dashboard-unread-bugs"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("bug_reports")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count || 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {})
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-unassigned-tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-tasks-combined"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const pipeline = pipelineDeals
    ? PIPELINE_STAGES.map((s) => {
        const deals = pipelineDeals.filter((d: any) => d.stage === s.key);
        const value = deals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);
        return { ...s, value: `${(value / 1000).toFixed(0)}k zł`, count: deals.length };
      })
    : EMPTY_PIPELINE;

  const pipelineValue = pipelineDeals
    ? `${(pipelineDeals.filter((d: any) => !["won", "lost"].includes(d.stage)).reduce((s: number, d: any) => s + Number(d.value || 0), 0) / 1000).toFixed(0)}k zł`
    : "0 zł";
  const pipelineCount = pipelineDeals
    ? `${pipelineDeals.filter((d: any) => !["won", "lost"].includes(d.stage)).length} szans`
    : "0 szans";

  return {
    overdue,
    corrections,
    clientReview,
    clientReviewTasks,
    correctionTasks,
    unassignedTasks,
    activeClients: activeClientCount ?? 0,
    totalClients: clientCount ?? 0,
    pipelineValue,
    pipelineCount,
    activities: activities || [],
    activitiesLoading,
    pipeline,
    unreadBugs: unreadBugsCount ?? 0,
  };
}

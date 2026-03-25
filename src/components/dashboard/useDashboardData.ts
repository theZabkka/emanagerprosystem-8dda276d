import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const { data: clientCount } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: activeClientCount } = useQuery({
    queryKey: ["clients-active-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active");
      return count || 0;
    },
  });

  const { data: taskStats } = useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const { data: tasks } = await supabase.from("tasks").select("status, is_archived").eq("is_archived", false);
      const corrections = tasks?.filter((t) => t.status === "corrections").length || 0;
      const clientReview = tasks?.filter((t) => t.status === "client_review").length || 0;
      return { overdue: 0, corrections, clientReview };
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: pipelineDeals } = useQuery({
    queryKey: ["dashboard-pipeline"],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_deals").select("stage, value");
      return data || [];
    },
  });

  const { data: clientReviewTasks } = useQuery({
    queryKey: ["dashboard-client-review-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title, status, priority, client_id, clients:client_id(name)").eq("status", "client_review").eq("is_archived", false);
      return data || [];
    },
  });

  const { data: correctionTasks } = useQuery({
    queryKey: ["dashboard-correction-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title, status, priority, client_id, clients:client_id(name)").eq("status", "corrections").eq("is_archived", false);
      return data || [];
    },
  });

  const { data: unreadBugsCount } = useQuery({
    queryKey: ["dashboard-unread-bugs"],
    queryFn: async () => {
      const { count } = await supabase.from("bug_reports").select("*", { count: "exact", head: true }).eq("is_read", false);
      return count || 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    overdue: taskStats?.overdue ?? 0,
    corrections: taskStats?.corrections ?? 0,
    clientReview: taskStats?.clientReview ?? 0,
    activeClients: activeClientCount ?? 0,
    totalClients: clientCount ?? 0,
    pipelineValue,
    pipelineCount,
    activities: activities || [],
    pipeline,
    clientReviewTasks: clientReviewTasks || [],
    correctionTasks: correctionTasks || [],
    unreadBugs: unreadBugsCount ?? 0,
  };
}

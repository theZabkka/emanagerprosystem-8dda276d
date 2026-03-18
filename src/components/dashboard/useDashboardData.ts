import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockClients, mockTasks, mockPipelineDeals, mockActivityLog } from "@/lib/mockData";

function getDemoStats() {
  const activeClients = mockClients.filter((c) => c.status === "active").length;
  const totalClients = mockClients.length;
  const overdue = mockTasks.filter(
    (t) => t.due_date < new Date().toISOString().split("T")[0] && t.status !== "done" && (t.status as string) !== "cancelled"
  ).length;
  const corrections = mockTasks.filter((t) => t.status === "corrections").length;
  const clientReview = mockTasks.filter((t) => t.status === "client_review").length;
  const pipelineValue = mockPipelineDeals
    .filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + (d.value || 0), 0);
  const pipelineCount = mockPipelineDeals.filter((d) => !["won", "lost"].includes(d.stage)).length;
  return { activeClients, totalClients, overdue, corrections, clientReview, pipelineValue, pipelineCount };
}

const PIPELINE_STAGES = [
  { label: "Potencjalny", key: "potential", color: "bg-muted" },
  { label: "Kontakt", key: "contact", color: "bg-info/20" },
  { label: "Oferta wysłana", key: "offer_sent", color: "bg-warning/20" },
  { label: "Negocjacje", key: "negotiations", color: "bg-primary/20" },
  { label: "Wygrane", key: "won", color: "bg-success/20" },
  { label: "Przegrane", key: "lost", color: "bg-destructive/20" },
];

function getDemoPipelineStages() {
  return PIPELINE_STAGES.map((s) => {
    const deals = mockPipelineDeals.filter((d) => d.stage === s.key);
    const value = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    return { ...s, value: `${(value / 1000).toFixed(0)}k zł`, count: deals.length };
  });
}

const EMPTY_PIPELINE = PIPELINE_STAGES.map((s) => ({ ...s, value: "0 zł", count: 0 }));

export function useDashboardData() {
  const { isDemo } = useDataSource();

  const { data: clientCount } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !isDemo,
  });

  const { data: activeClientCount } = useQuery({
    queryKey: ["clients-active-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active");
      return count || 0;
    },
    enabled: !isDemo,
  });

  const { data: taskStats } = useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const { data: tasks } = await supabase.from("tasks").select("status");
      const corrections = tasks?.filter((t) => t.status === "corrections").length || 0;
      const clientReview = tasks?.filter((t) => t.status === "client_review").length || 0;
      return { overdue: 0, corrections, clientReview };
    },
    enabled: !isDemo,
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
    enabled: !isDemo,
  });

  useEffect(() => {
    if (isDemo) return;
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemo]);

  const demo = isDemo ? getDemoStats() : null;

  return {
    isDemo,
    overdue: isDemo ? demo!.overdue : (taskStats?.overdue ?? 0),
    corrections: isDemo ? demo!.corrections : (taskStats?.corrections ?? 0),
    clientReview: isDemo ? demo!.clientReview : (taskStats?.clientReview ?? 0),
    activeClients: isDemo ? demo!.activeClients : (activeClientCount ?? 0),
    totalClients: isDemo ? demo!.totalClients : (clientCount ?? 0),
    pipelineValue: isDemo ? `${(demo!.pipelineValue / 1000).toFixed(0)}k zł` : "0 zł",
    pipelineCount: isDemo ? `${demo!.pipelineCount} szans` : "0 szans",
    activities: isDemo ? mockActivityLog : (activities || []),
    pipeline: isDemo ? getDemoPipelineStages() : EMPTY_PIPELINE,
    clientReviewTasks: isDemo ? mockTasks.filter((t) => t.status === "client_review") : [],
    correctionTasks: isDemo ? mockTasks.filter((t) => t.status === "corrections") : [],
  };
}

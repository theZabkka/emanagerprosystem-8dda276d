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
      const { data: tasks } = await supabase.from("tasks").select("status, is_archived, due_date").eq("is_archived", false);
      const today = new Date().toISOString().split("T")[0];
      const activeTasks = tasks?.filter((t) => !["done", "closed", "cancelled"].includes(t.status || "")) || [];
      const overdue = activeTasks.filter((t: any) => t.due_date && t.due_date < today).length;
      const corrections = tasks?.filter((t) => t.status === "corrections").length || 0;
      const clientReview = tasks?.filter((t) => t.status === "client_review").length || 0;
      return { overdue, corrections, clientReview };
    },
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["recent-activity"],
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

  const { data: unassignedTasksCount } = useQuery({
    queryKey: ["dashboard-unassigned-tasks"],
    queryFn: async () => {
      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("id, title, task_assignments(task_id)")
        .eq("is_archived", false)
        .not("status", "in", '("done","closed","cancelled")')
        .not("title", "is", null)
        .neq("title", "");

      if (!activeTasks || activeTasks.length === 0) return 0;

      return activeTasks.filter((t: any) => (t.task_assignments || []).length === 0).length;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-unassigned-tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-unassigned-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task-stats"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-client-review-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-correction-tasks"] });
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
    overdue: taskStats?.overdue ?? 0,
    corrections: taskStats?.corrections ?? 0,
    clientReview: taskStats?.clientReview ?? 0,
    activeClients: activeClientCount ?? 0,
    totalClients: clientCount ?? 0,
    pipelineValue,
    pipelineCount,
    activities: activities || [],
    activitiesLoading,
    pipeline,
    clientReviewTasks: clientReviewTasks || [],
    correctionTasks: correctionTasks || [],
    unreadBugs: unreadBugsCount ?? 0,
    unassignedTasks: unassignedTasksCount ?? 0,
  };
}

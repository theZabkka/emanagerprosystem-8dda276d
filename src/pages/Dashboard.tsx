import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, TrendingUp, Clock, TicketCheck, RefreshCcw, CheckCircle2, ArrowRight, MessageCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

function AlertBanner({ color, icon: Icon, text, actionText }: { color: string; icon: React.ElementType; text: string; actionText?: string }) {
  const bgClass = color === "red" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-warning/10 border-warning/30 text-warning-foreground";
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${bgClass}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1">{text}</span>
      {actionText && (
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          {actionText} <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string | number; subtitle?: string; icon: React.ElementType; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color || "bg-primary/10"}`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const pipelineStages = [
  { label: "Potencjalny", value: "0 zł", count: 0, color: "bg-muted" },
  { label: "Kontakt", value: "0 zł", count: 0, color: "bg-info/20" },
  { label: "Oferta wysłana", value: "0 zł", count: 0, color: "bg-warning/20" },
  { label: "Negocjacje", value: "0 zł", count: 0, color: "bg-primary/20" },
  { label: "Wygrane", value: "0 zł", count: 0, color: "bg-success/20" },
  { label: "Przegrane", value: "0 zł", count: 0, color: "bg-destructive/20" },
];

export default function Dashboard() {
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
      const { data: tasks } = await supabase.from("tasks").select("status");
      const overdue = 0; // TODO: calculate from due_date
      const corrections = tasks?.filter((t) => t.status === "corrections").length || 0;
      const clientReview = tasks?.filter((t) => t.status === "client_review").length || 0;
      return { overdue, corrections, clientReview };
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

  // Real-time subscription for activity_log
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {
        // Invalidate react-query cache
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <AppLayout title="Pulpit">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Alert banners */}
        <div className="space-y-2">
          <AlertBanner color="red" icon={AlertTriangle} text="Masz 0 nieprzypisanych zadań" actionText="Zobacz" />
          <AlertBanner color="orange" icon={RefreshCcw} text="0 zadań w poprawkach" actionText="Zobacz" />
          <AlertBanner color="orange" icon={CheckCircle2} text="0 zadań oczekuje na weryfikację" actionText="Zobacz" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Klienci" value={activeClientCount ?? 0} subtitle={`/ ${clientCount ?? 0} ogółem`} icon={Users} />
          <StatCard title="Wartość lejka" value="0 zł" subtitle="0 szans" icon={TrendingUp} />
          <StatCard title="Zaległe" value={taskStats?.overdue ?? 0} icon={Clock} />
          <StatCard title="Zgłoszenia" value="0" subtitle="/ 0 ogółem" icon={TicketCheck} />
          <StatCard title="W poprawkach" value={taskStats?.corrections ?? 0} icon={RefreshCcw} />
          <StatCard title="Do akceptacji" value={taskStats?.clientReview ?? 0} icon={Eye} />
        </div>

        {/* Client acceptance & quality tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Czeka na akceptację klienta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Brak zadań oczekujących na akceptację.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zadania z problemami jakości</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Brak zadań z problemami jakości.</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline & Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ostatnia aktywność</CardTitle>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {(act.profiles?.full_name || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{act.profiles?.full_name}</span>{" "}
                          <span className="text-muted-foreground">{act.action}</span>{" "}
                          <span className="font-medium">{act.entity_name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(act.created_at).toLocaleString("pl-PL")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak aktywności.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lejek sprzedaży</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pipelineStages.map((stage) => (
                  <div key={stage.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <span className="text-sm">{stage.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{stage.value}</span>
                      <span className="text-xs text-muted-foreground ml-2">({stage.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team workload & Verification quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Obciążenie zespołu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Brak danych o obciążeniu zespołu.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Jakość weryfikacji zespołu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Brak danych o jakości weryfikacji.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

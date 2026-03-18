import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, TrendingUp, Clock, TicketCheck, RefreshCcw, CheckCircle2, ArrowRight, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockClients, mockTasks, mockPipelineDeals, mockActivityLog } from "@/lib/mockData";
import { useEffect } from "react";

// --- Sub-components ---

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

// --- Demo data helpers ---

function getDemoStats() {
  const activeClients = mockClients.filter(c => c.status === "active").length;
  const totalClients = mockClients.length;
  const overdue = mockTasks.filter(t => t.due_date < new Date().toISOString().split("T")[0] && t.status !== "done" && t.status !== "cancelled").length;
  const corrections = mockTasks.filter(t => t.status === "corrections").length;
  const clientReview = mockTasks.filter(t => t.status === "client_review").length;
  const pipelineValue = mockPipelineDeals.filter(d => !["won", "lost"].includes(d.stage)).reduce((s, d) => s + (d.value || 0), 0);
  const pipelineCount = mockPipelineDeals.filter(d => !["won", "lost"].includes(d.stage)).length;
  return { activeClients, totalClients, overdue, corrections, clientReview, pipelineValue, pipelineCount };
}

function getDemoPipelineStages() {
  const stages = [
    { label: "Potencjalny", key: "potential", color: "bg-muted" },
    { label: "Kontakt", key: "contact", color: "bg-info/20" },
    { label: "Oferta wysłana", key: "offer_sent", color: "bg-warning/20" },
    { label: "Negocjacje", key: "negotiations", color: "bg-primary/20" },
    { label: "Wygrane", key: "won", color: "bg-success/20" },
    { label: "Przegrane", key: "lost", color: "bg-destructive/20" },
  ];
  return stages.map(s => {
    const deals = mockPipelineDeals.filter(d => d.stage === s.key);
    const value = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    return { ...s, value: `${(value / 1000).toFixed(0)}k zł`, count: deals.length };
  });
}

// --- Main component ---

export default function Dashboard() {
  const { isDemo } = useDataSource();

  // Real data queries (disabled when demo)
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

  // Real-time subscription
  useEffect(() => {
    if (isDemo) return;
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemo]);

  // Compute display data
  const demo = isDemo ? getDemoStats() : null;
  const displayActivities = isDemo ? mockActivityLog : (activities || []);
  const displayPipeline = isDemo
    ? getDemoPipelineStages()
    : [
        { label: "Potencjalny", value: "0 zł", count: 0, color: "bg-muted" },
        { label: "Kontakt", value: "0 zł", count: 0, color: "bg-info/20" },
        { label: "Oferta wysłana", value: "0 zł", count: 0, color: "bg-warning/20" },
        { label: "Negocjacje", value: "0 zł", count: 0, color: "bg-primary/20" },
        { label: "Wygrane", value: "0 zł", count: 0, color: "bg-success/20" },
        { label: "Przegrane", value: "0 zł", count: 0, color: "bg-destructive/20" },
      ];

  const dOverdue = isDemo ? demo!.overdue : (taskStats?.overdue ?? 0);
  const dCorrections = isDemo ? demo!.corrections : (taskStats?.corrections ?? 0);
  const dClientReview = isDemo ? demo!.clientReview : (taskStats?.clientReview ?? 0);
  const dActiveClients = isDemo ? demo!.activeClients : (activeClientCount ?? 0);
  const dTotalClients = isDemo ? demo!.totalClients : (clientCount ?? 0);
  const dPipelineValue = isDemo ? `${(demo!.pipelineValue / 1000).toFixed(0)}k zł` : "0 zł";
  const dPipelineCount = isDemo ? `${demo!.pipelineCount} szans` : "0 szans";

  // Tasks awaiting client review (demo)
  const demoClientReviewTasks = isDemo ? mockTasks.filter(t => t.status === "client_review") : [];
  const demoCorrectionTasks = isDemo ? mockTasks.filter(t => t.status === "corrections") : [];

  return (
    <AppLayout title="Pulpit">
      <div className="space-y-6 max-w-7xl mx-auto">
        {isDemo && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            🎭 Tryb demo — wyświetlane są przykładowe dane testowe.
            <a href="/settings" className="underline font-medium ml-1">Zmień w Ustawieniach</a>
          </div>
        )}

        {/* Alert banners */}
        <div className="space-y-2">
          <AlertBanner color="red" icon={AlertTriangle} text={`Masz ${dOverdue} zaległych zadań`} actionText="Zobacz" />
          <AlertBanner color="orange" icon={RefreshCcw} text={`${dCorrections} zadań w poprawkach`} actionText="Zobacz" />
          <AlertBanner color="orange" icon={CheckCircle2} text={`${dClientReview} zadań oczekuje na weryfikację`} actionText="Zobacz" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Klienci" value={dActiveClients} subtitle={`/ ${dTotalClients} ogółem`} icon={Users} />
          <StatCard title="Wartość lejka" value={dPipelineValue} subtitle={dPipelineCount} icon={TrendingUp} />
          <StatCard title="Zaległe" value={dOverdue} icon={Clock} />
          <StatCard title="Zgłoszenia" value="0" subtitle="/ 0 ogółem" icon={TicketCheck} />
          <StatCard title="W poprawkach" value={dCorrections} icon={RefreshCcw} />
          <StatCard title="Do akceptacji" value={dClientReview} icon={Eye} />
        </div>

        {/* Client acceptance & quality tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Czeka na akceptację klienta</CardTitle></CardHeader>
            <CardContent>
              {demoClientReviewTasks.length > 0 ? (
                <div className="space-y-2">
                  {demoClientReviewTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{t.title}</span>
                      <Badge variant="outline" className="text-xs">{t.priority}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak zadań oczekujących na akceptację.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Zadania z problemami jakości</CardTitle></CardHeader>
            <CardContent>
              {demoCorrectionTasks.length > 0 ? (
                <div className="space-y-2">
                  {demoCorrectionTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{t.title}</span>
                      <Badge variant="destructive" className="text-xs">Poprawki</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak zadań z problemami jakości.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline & Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Ostatnia aktywność</CardTitle></CardHeader>
            <CardContent>
              {displayActivities.length > 0 ? (
                <div className="space-y-3">
                  {displayActivities.map((act: any) => (
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Lejek sprzedaży</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {displayPipeline.map((stage) => (
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Obciążenie zespołu</CardTitle></CardHeader>
            <CardContent>
              {isDemo ? (
                <div className="space-y-2">
                  {[
                    { name: "Piotr Wiśniewski", tasks: 5, hours: 28 },
                    { name: "Anna Nowak", tasks: 3, hours: 18 },
                    { name: "Tomasz Lewandowski", tasks: 2, hours: 15 },
                    { name: "Katarzyna Zielińska", tasks: 2, hours: 10 },
                  ].map(m => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{m.name}</span>
                      <span className="text-muted-foreground">{m.tasks} zadań · {m.hours}h</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych o obciążeniu zespołu.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Jakość weryfikacji zespołu</CardTitle></CardHeader>
            <CardContent>
              {isDemo ? (
                <div className="space-y-2">
                  {[
                    { name: "Jan Kowalski", rate: "94%" },
                    { name: "Anna Nowak", rate: "88%" },
                    { name: "Katarzyna Zielińska", rate: "91%" },
                  ].map(m => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{m.name}</span>
                      <Badge variant="outline">{m.rate}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych o jakości weryfikacji.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

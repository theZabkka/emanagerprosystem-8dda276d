import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Clock, PieChart, AlertTriangle, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart as RechartsPie, Pie, Cell } from "recharts";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { QualityRankingTable } from "@/components/analytics/QualityRankingTable";

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(150, 60%, 45%)",
];

export default function Analytics() {
  const [days, setDays] = useState("30");
  const [projectId, setProjectId] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString();
  }, [days]);

  const { data: projects } = useQuery({
    queryKey: ["analytics-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("is_archived", false).order("name");
      return data || [];
    },
  });

  const rpcProjectId = projectId === "all" ? null : projectId;
  const rpcUserId = userId === "all" ? null : userId;

  const { data: rejectionStats, isLoading: loadingRejections } = useQuery({
    queryKey: ["rejection-stats", fromDate, rpcProjectId, rpcUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rejection_stats", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: rpcProjectId,
        _user_id: rpcUserId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const { data: leadTimeStats, isLoading: loadingLeadTime } = useQuery({
    queryKey: ["lead-time-stats", fromDate, rpcProjectId, rpcUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lead_time_stats", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: rpcProjectId,
        _user_id: rpcUserId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const avgHours = leadTimeStats?.overall_avg_hours ?? 0;
  const avgDays = (avgHours / 24).toFixed(1);

  const categoryData = (rejectionStats?.by_category || []) as { reason_category: string; count: number }[];
  const topRejected = (rejectionStats?.top_rejected_tasks || []) as { task_id: string; title: string; rejection_count: number }[];
  const totalRejections = categoryData.reduce((s, c) => s + c.count, 0);

  const chartConfig: ChartConfig = {};
  categoryData.forEach((c, i) => {
    chartConfig[c.reason_category] = {
      label: c.reason_category,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    };
  });

  return (
    <AppLayout title="Analizy">
      <div className="space-y-6 mx-auto max-w-7xl">
        <AnalyticsFilters
          days={days} setDays={setDays}
          projectId={projectId} setProjectId={setProjectId}
          userId={userId} setUserId={setUserId}
          projects={projects || []}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Średni czas realizacji</p>
                  <p className="text-4xl font-bold text-foreground mt-1">{loadingLeadTime ? "—" : avgDays}</p>
                  <p className="text-xs text-muted-foreground mt-1">dni ({avgHours}h)</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10"><Clock className="h-6 w-6 text-primary" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Odrzucenia łącznie</p>
                  <p className="text-4xl font-bold text-foreground mt-1">{loadingRejections ? "—" : totalRejections}</p>
                  <p className="text-xs text-muted-foreground mt-1">w wybranym okresie</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10"><TrendingDown className="h-6 w-6 text-destructive" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Główna przyczyna</p>
                  <p className="text-lg font-bold text-foreground mt-1 leading-tight">
                    {loadingRejections ? "—" : (categoryData[0]?.reason_category || "Brak danych")}
                  </p>
                  {categoryData[0] && <p className="text-xs text-muted-foreground mt-1">{categoryData[0].count} przypadków</p>}
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10"><AlertTriangle className="h-6 w-6 text-amber-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                Przyczyny poprawek
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Brak danych odrzuceń w wybranym okresie</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ChartContainer config={chartConfig} className="h-[200px] w-[200px] flex-shrink-0">
                    <RechartsPie>
                      <Pie data={categoryData} dataKey="count" nameKey="reason_category" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPie>
                  </ChartContainer>
                  <div className="space-y-2 flex-1 min-w-0">
                    {categoryData.map((c, i) => (
                      <div key={c.reason_category} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{c.reason_category}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">{c.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Najczęściej poprawiane zadania
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topRejected.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Brak danych w wybranym okresie</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zadanie</TableHead>
                      <TableHead className="text-right w-24">Odrzucenia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRejected.map((t) => (
                      <TableRow key={t.task_id}>
                        <TableCell>
                          <Link to={`/tasks/${t.task_id}`} className="text-sm font-medium hover:underline text-foreground">{t.title}</Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="text-xs">{t.rejection_count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Time by Project */}
        {(leadTimeStats?.by_project || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Czas realizacji wg projektu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-right w-28">Zadania</TableHead>
                    <TableHead className="text-right w-36">Śr. czas (h)</TableHead>
                    <TableHead className="text-right w-36">Śr. czas (dni)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leadTimeStats.by_project as any[]).map((p: any) => (
                    <TableRow key={p.project_id || "none"}>
                      <TableCell className="font-medium">{p.project_name || "Bez projektu"}</TableCell>
                      <TableCell className="text-right">{p.task_count}</TableCell>
                      <TableCell className="text-right">{p.avg_hours}h</TableCell>
                      <TableCell className="text-right">{(p.avg_hours / 24).toFixed(1)} dni</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Quality Ranking */}
        <QualityRankingTable fromDate={fromDate} projectId={rpcProjectId} />
      </div>
    </AppLayout>
  );
}

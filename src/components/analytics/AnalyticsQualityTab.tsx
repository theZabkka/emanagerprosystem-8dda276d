import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, AlertTriangle, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart as RechartsPie, Pie, Cell } from "recharts";
import { QualityRankingTable } from "./QualityRankingTable";

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(150, 60%, 45%)",
];

interface Props {
  fromDate: string;
  projectId: string | null;
  userId: string | null;
}

export function AnalyticsQualityTab({ fromDate, projectId, userId }: Props) {
  const { data: rejectionStats, isLoading } = useQuery({
    queryKey: ["rejection-stats", fromDate, projectId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rejection_stats", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: projectId,
        _user_id: userId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

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
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Odrzucenia łącznie</p>
                <p className="text-4xl font-bold text-foreground mt-1">{isLoading ? "—" : totalRejections}</p>
                <p className="text-xs text-muted-foreground mt-1">w wybranym okresie</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Główna przyczyna</p>
                <p className="text-lg font-bold text-foreground mt-1 leading-tight">
                  {isLoading ? "—" : (categoryData[0]?.reason_category || "Brak danych")}
                </p>
                {categoryData[0] && <p className="text-xs text-muted-foreground mt-1">{categoryData[0].count} przypadków</p>}
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
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

      {/* Quality Ranking */}
      <QualityRankingTable fromDate={fromDate} projectId={projectId} />
    </div>
  );
}

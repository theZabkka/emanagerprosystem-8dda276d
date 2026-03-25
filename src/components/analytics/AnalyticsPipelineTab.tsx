import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Trophy, XCircle, Timer, AlertOctagon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

export function AnalyticsPipelineTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["pipeline-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pipeline_stats" as any);
      if (error) throw error;
      return data as any;
    },
  });

  const { data: advanced, isLoading: isLoadingAdv } = useQuery({
    queryKey: ["pipeline-advanced-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pipeline_advanced_metrics" as any);
      if (error) throw error;
      return data as any;
    },
  });

  const wonCount = stats?.won_count ?? 0;
  const lostCount = stats?.lost_count ?? 0;
  const winRate = stats?.win_rate ?? 0;
  const totalClosed = stats?.total_closed ?? 0;

  const avgCycleDays = advanced?.avg_sales_cycle_days ?? 0;
  const bottleneck = advanced?.bottleneck;

  const chartData = [
    { name: "Wygrane", value: wonCount, fill: "hsl(var(--primary))" },
    { name: "Przegrane", value: lostCount, fill: "hsl(var(--muted-foreground))" },
  ];

  const chartConfig = {
    won: { label: "Wygrane", color: "hsl(var(--primary))" },
    lost: { label: "Przegrane", color: "hsl(var(--muted-foreground))" },
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Basic stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Win Rate (Konwersja)</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoading ? "—" : `${winRate}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalClosed} zamkniętych szans
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Wygrane szanse</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoading ? "—" : wonCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Przegrane szanse</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoading ? "—" : lostCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Advanced metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Średni cykl sprzedaży</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoadingAdv ? "—" : avgCycleDays > 0 ? `${avgCycleDays}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {avgCycleDays > 0 ? "dni (od utworzenia do wygranej)" : "brak danych"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Timer className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground font-medium">Wąskie gardło lejka</p>
                {isLoadingAdv ? (
                  <p className="text-4xl font-bold text-foreground mt-1">—</p>
                ) : bottleneck ? (
                  <>
                    <p className="text-xl font-bold text-foreground mt-1 truncate">{bottleneck.column_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      śr. {bottleneck.avg_days} dni w tym etapie
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-muted-foreground mt-1">Brak danych</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Przenoś karty między etapami, aby zbierać dane
                    </p>
                  </>
                )}
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 ml-4">
                <AlertOctagon className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalClosed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rozkład wyników sprzedaży</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

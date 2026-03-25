import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, CheckCircle, AlertTriangle, HeartPulse } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  fromDate: string;
  projectId: string | null;
  userId: string | null;
}

export function AnalyticsTasksTab({ fromDate, projectId, userId }: Props) {
  const { data: leadTimeStats, isLoading } = useQuery({
    queryKey: ["lead-time-stats", fromDate, projectId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lead_time_stats", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: projectId,
        _user_id: userId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const { data: extraStats, isLoading: isLoadingExtra } = useQuery({
    queryKey: ["task-extra-stats", fromDate, projectId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_task_extra_stats", {
        _from_date: fromDate,
        _to_date: new Date().toISOString(),
        _project_id: projectId,
        _user_id: userId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ["project-health", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_health_score", {
        p_project_id: projectId,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const avgHours = leadTimeStats?.overall_avg_hours ?? 0;
  const avgDays = (avgHours / 24).toFixed(1);
  const ontimePercent = extraStats?.ontime_percentage ?? 0;
  const backlogCount = extraStats?.backlog_count ?? 0;

  const healthScore = healthData?.score ?? null;
  const healthColor = healthScore === null ? "text-muted-foreground" :
    healthScore >= 80 ? "text-green-600" :
    healthScore >= 50 ? "text-yellow-500" : "text-destructive";
  const healthBg = healthScore === null ? "bg-muted" :
    healthScore >= 80 ? "bg-green-500/10" :
    healthScore >= 50 ? "bg-yellow-500/10" : "bg-destructive/10";

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Średni czas realizacji</p>
                <p className="text-4xl font-bold text-foreground mt-1">{isLoading ? "—" : avgDays}</p>
                <p className="text-xs text-muted-foreground mt-1">dni ({avgHours}h)</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Terminowość (On-Time)</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoadingExtra ? "—" : `${ontimePercent}%`}
                </p>
                <div className="mt-2">
                  <Progress value={ontimePercent} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {extraStats?.on_time_count ?? 0} / {extraStats?.total_with_due ?? 0} zadań z terminem
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 ml-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Backlog (Zaległości)</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {isLoadingExtra ? "—" : backlogCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">zadań do zrobienia</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Health Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Kondycja Projektu</p>
                {!projectId ? (
                  <>
                    <p className="text-xl font-bold text-muted-foreground mt-1">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Wybierz projekt w filtrze</p>
                  </>
                ) : isLoadingHealth ? (
                  <p className="text-4xl font-bold text-foreground mt-1">—</p>
                ) : (
                  <>
                    <p className={cn("text-4xl font-bold mt-1", healthColor)}>
                      {healthScore ?? 0}
                    </p>
                    <div className="mt-2">
                      <Progress value={healthScore ?? 0} className={cn("h-2", healthScore !== null && healthScore < 50 && "[&>div]:bg-destructive", healthScore !== null && healthScore >= 50 && healthScore < 80 && "[&>div]:bg-yellow-500")} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {healthData?.overdue ?? 0} opóźnionych / {healthData?.total_active ?? 0} aktywnych
                    </p>
                  </>
                )}
              </div>
              <div className={cn("p-3 rounded-xl ml-4", healthBg)}>
                <HeartPulse className={cn("h-6 w-6", healthColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead time by project table */}
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
    </div>
  );
}

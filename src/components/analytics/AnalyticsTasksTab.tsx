import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock } from "lucide-react";

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

  const avgHours = leadTimeStats?.overall_avg_hours ?? 0;
  const avgDays = (avgHours / 24).toFixed(1);

  return (
    <div className="space-y-6">
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

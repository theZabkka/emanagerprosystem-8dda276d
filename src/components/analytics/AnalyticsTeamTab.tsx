import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Props {
  projectId: string | null;
  userId: string | null;
}

export function AnalyticsTeamTab({ projectId, userId }: Props) {
  const { data: workload, isLoading } = useQuery({
    queryKey: ["team-workload", projectId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_workload", {
        _project_id: projectId,
        _user_id: userId,
      } as any);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const maxActive = Math.max(...(workload || []).map((w: any) => w.total_active), 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Obciążenie pracą (Workload)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : !workload || workload.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Brak aktywnych zadań do wyświetlenia.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pracownik</TableHead>
                  <TableHead className="text-right w-28">Do zrobienia</TableHead>
                  <TableHead className="text-right w-28">W realizacji</TableHead>
                  <TableHead className="text-right w-24">Razem</TableHead>
                  <TableHead className="w-48">Obciążenie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workload.map((w: any) => (
                  <TableRow key={w.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={w.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(w.full_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{w.full_name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{w.todo_count}</TableCell>
                    <TableCell className="text-right">{w.in_progress_count}</TableCell>
                    <TableCell className="text-right font-semibold">{w.total_active}</TableCell>
                    <TableCell>
                      <Progress
                        value={(w.total_active / maxActive) * 100}
                        className="h-2"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockTimeLogs, mockProfiles, mockTasks, mockClients } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock, TrendingUp, Users, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { pl } from "date-fns/locale";

export default function TimeReports() {
  const [period, setPeriod] = useState("this-month");

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "last-month":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "this-month":
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  const { data: timeLogs = [] } = useQuery({
    queryKey: ["time-logs-report", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("*, profiles:user_id(full_name), tasks:task_id(title, client_id, clients:client_id(name))")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role");
      return data || [];
    },
  });

  const totalMinutes = timeLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  // Group by user
  const byUser = useMemo(() => {
    const map: Record<string, { name: string; minutes: number; tasks: number }> = {};
    timeLogs.forEach((log: any) => {
      const uid = log.user_id;
      const name = (log.profiles as any)?.full_name || "—";
      if (!map[uid]) map[uid] = { name, minutes: 0, tasks: 0 };
      map[uid].minutes += log.duration || 0;
      map[uid].tasks += 1;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [timeLogs]);

  // Group by task
  const byTask = useMemo(() => {
    const map: Record<string, { title: string; client: string; minutes: number; entries: number }> = {};
    timeLogs.forEach((log: any) => {
      const tid = log.task_id;
      const title = (log.tasks as any)?.title || "—";
      const client = (log.tasks as any)?.clients?.name || "—";
      if (!map[tid]) map[tid] = { title, client, minutes: 0, entries: 0 };
      map[tid].minutes += log.duration || 0;
      map[tid].entries += 1;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [timeLogs]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout title="Raporty czasu">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Ten miesiąc</SelectItem>
              <SelectItem value="last-month">Poprzedni miesiąc</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
                  <p className="text-sm text-muted-foreground">Łącznie zalogowano</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{timeLogs.length}</p>
                  <p className="text-sm text-muted-foreground">Wpisów czasu</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{byUser.length}</p>
                  <p className="text-sm text-muted-foreground">Aktywnych osób</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{byTask.length}</p>
                  <p className="text-sm text-muted-foreground">Zadań z logami</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Czas pracy wg osoby</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Osoba</TableHead>
                  <TableHead className="text-right">Wpisy</TableHead>
                  <TableHead className="text-right">Czas</TableHead>
                  <TableHead className="text-right">Udział</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byUser.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{u.tasks}</TableCell>
                    <TableCell className="text-right font-medium">{formatDuration(u.minutes)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalMinutes > 0 ? Math.round((u.minutes / totalMinutes) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {byUser.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Brak danych za wybrany okres
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* By task */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Czas pracy wg zadania</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zadanie</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead className="text-right">Wpisy</TableHead>
                  <TableHead className="text-right">Czas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byTask.slice(0, 20).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{t.client}</TableCell>
                    <TableCell className="text-right">{t.entries}</TableCell>
                    <TableCell className="text-right font-medium">{formatDuration(t.minutes)}</TableCell>
                  </TableRow>
                ))}
                {byTask.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Brak danych za wybrany okres
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

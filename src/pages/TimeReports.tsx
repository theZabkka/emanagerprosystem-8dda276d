import { useState, useMemo } from "react";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Clock, TrendingUp, Users, BarChart3, Download, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subDays, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";

const PAGE_SIZE = 50;

export default function TimeReports() {
  const [period, setPeriod] = useState("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [page, setPage] = useState(0);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "this-week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last-month":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "last-90":
        return { start: subDays(now, 90), end: now };
      case "custom":
        return {
          start: customFrom ? new Date(customFrom) : startOfMonth(now),
          end: customTo ? new Date(customTo) : endOfMonth(now),
        };
      case "this-month":
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customFrom, customTo]);

  const { data: timeLogs = [], isLoading } = useQuery({
    queryKey: ["time-logs-report", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("id, created_at, duration, description, phase, user_id, task_id, profiles:user_id(full_name, avatar_url), tasks:task_id(title, client_id, clients:client_id(name))")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      return data || [];
    },
  });

  const { data: profiles = [] } = useStaffMembers();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Apply user/client filters
  const filteredLogs = useMemo(() => {
    let logs = timeLogs as any[];
    if (selectedUser !== "all") logs = logs.filter((l) => l.user_id === selectedUser);
    if (selectedClient !== "all") logs = logs.filter((l) => (l.tasks as any)?.client_id === selectedClient);
    return logs;
  }, [timeLogs, selectedUser, selectedClient]);

  const totalMinutes = filteredLogs.reduce((s: number, l: any) => s + (l.duration || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const daysInRange = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
  const avgDaily = Math.round((totalMinutes / 60 / daysInRange) * 10) / 10;

  const uniqueUsers = useMemo(() => new Set(filteredLogs.map((l: any) => l.user_id)), [filteredLogs]);

  // Group by user
  const byUser = useMemo(() => {
    const map: Record<string, { name: string; avatar_url: string | null; minutes: number; entries: number; days: Set<string> }> = {};
    filteredLogs.forEach((log: any) => {
      const uid = log.user_id;
      const name = (log.profiles as any)?.full_name || "—";
      const avatar = (log.profiles as any)?.avatar_url || null;
      if (!map[uid]) map[uid] = { name, avatar_url: avatar, minutes: 0, entries: 0, days: new Set() };
      map[uid].minutes += log.duration || 0;
      map[uid].entries += 1;
      if (log.created_at) map[uid].days.add(log.created_at.slice(0, 10));
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v, activeDays: v.days.size }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredLogs]);

  // Group by client
  const byClient = useMemo(() => {
    const map: Record<string, { name: string; minutes: number; entries: number; tasks: Set<string> }> = {};
    filteredLogs.forEach((log: any) => {
      const cid = (log.tasks as any)?.client_id || "none";
      const name = (log.tasks as any)?.clients?.name || "Bez klienta";
      if (!map[cid]) map[cid] = { name, minutes: 0, entries: 0, tasks: new Set() };
      map[cid].minutes += log.duration || 0;
      map[cid].entries += 1;
      if (log.task_id) map[cid].tasks.add(log.task_id);
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v, taskCount: v.tasks.size }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filteredLogs]);

  // Paginated details
  const pagedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const exportCSV = () => {
    const header = "Data,Pracownik,Zadanie,Klient,Opis,Czas (min)\n";
    const rows = filteredLogs.map((l: any) => {
      const date = l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : "";
      const user = (l.profiles as any)?.full_name || "";
      const task = (l.tasks as any)?.title || "";
      const client = (l.tasks as any)?.clients?.name || "";
      const desc = (l.description || "").replace(/[",\n]/g, " ");
      return `${date},"${user}","${task}","${client}","${desc}",${l.duration || 0}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport-czasu-${format(dateRange.start, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Raporty czasu">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Okres</label>
            <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">Ten tydzień</SelectItem>
                <SelectItem value="this-month">Ten miesiąc</SelectItem>
                <SelectItem value="last-month">Poprzedni miesiąc</SelectItem>
                <SelectItem value="last-90">Ostatnie 90 dni</SelectItem>
                <SelectItem value="custom">Własny zakres</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Od</label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[140px] h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Do</label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[140px] h-9 text-xs" />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pracownik</label>
            <Select value={selectedUser} onValueChange={(v) => { setSelectedUser(v); setPage(0); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Klient</label>
            <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setPage(0); }}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Eksport CSV
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: "Łącznie godzin", value: `${totalHours}h` },
            { icon: BarChart3, label: "Wpisów czasu", value: String(filteredLogs.length) },
            { icon: Users, label: "Aktywnych osób", value: String(uniqueUsers.size) },
            { icon: TrendingUp, label: "Śr. dziennie", value: `${avgDaily}h` },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-7 w-7 text-primary shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-3">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Pracownicy</TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Klienci</TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Szczegóły</TabsTrigger>
          </TabsList>

          {/* --- Users tab --- */}
          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Osoba</TableHead>
                      <TableHead className="text-right">Dni aktywne</TableHead>
                      <TableHead className="text-right">Wpisy</TableHead>
                      <TableHead className="text-right">Czas</TableHead>
                      <TableHead className="text-right">Śr./dzień</TableHead>
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
                        <TableCell className="text-right">{u.activeDays}</TableCell>
                        <TableCell className="text-right">{u.entries}</TableCell>
                        <TableCell className="text-right font-medium">{formatDuration(u.minutes)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {u.activeDays > 0 ? formatDuration(Math.round(u.minutes / u.activeDays)) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalMinutes > 0 ? Math.round((u.minutes / totalMinutes) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {byUser.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Brak danych za wybrany okres
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Clients tab --- */}
          <TabsContent value="clients">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klient</TableHead>
                      <TableHead className="text-right">Zadań</TableHead>
                      <TableHead className="text-right">Wpisy</TableHead>
                      <TableHead className="text-right">Czas</TableHead>
                      <TableHead className="text-right">Udział</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClient.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">{c.taskCount}</TableCell>
                        <TableCell className="text-right">{c.entries}</TableCell>
                        <TableCell className="text-right font-medium">{formatDuration(c.minutes)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalMinutes > 0 ? Math.round((c.minutes / totalMinutes) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {byClient.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Brak danych za wybrany okres
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Details tab --- */}
          <TabsContent value="details">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Pracownik</TableHead>
                      <TableHead>Zadanie</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead className="max-w-[200px]">Opis</TableHead>
                      <TableHead className="text-right">Czas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLogs.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {l.created_at ? format(new Date(l.created_at), "dd.MM.yy HH:mm", { locale: pl }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{(l.profiles as any)?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{(l.tasks as any)?.title || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(l.tasks as any)?.clients?.name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatDuration(l.duration || 0)}</TableCell>
                      </TableRow>
                    ))}
                    {pagedLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Brak danych za wybrany okres
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} z {filteredLogs.length}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

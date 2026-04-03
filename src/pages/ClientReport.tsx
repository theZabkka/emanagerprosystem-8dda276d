import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function ClientReport() {
  const { isClient, clientId } = useRole();
  const { profile } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const prev = () =>
    setSelectedDate((d) =>
      d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 }
    );
  const next = () =>
    setSelectedDate((d) =>
      d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 }
    );

  const rangeStart = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, "0")}-01`;
  const nextMonth = selectedDate.month === 11
    ? { year: selectedDate.year + 1, month: 0 }
    : { year: selectedDate.year, month: selectedDate.month + 1 };
  const rangeEnd = `${nextMonth.year}-${String(nextMonth.month + 1).padStart(2, "0")}-01`;

  // Tickets for this client
  const { data: tickets = [] } = useQuery({
    queryKey: ["client-report-tickets", clientId, rangeStart],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("tickets")
        .select("id, title, status, created_at")
        .eq("client_id", clientId)
        .gte("created_at", rangeStart)
        .lt("created_at", rangeEnd);
      return data || [];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  // Tasks completed in this month for this client
  const { data: tasks = [] } = useQuery({
    queryKey: ["client-report-tasks", clientId, rangeStart],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, status_updated_at, updated_at")
        .eq("client_id", clientId)
        .in("status", ["done", "cancelled"])
        .gte("status_updated_at", rangeStart)
        .lt("status_updated_at", rangeEnd);
      return data || [];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  // KPIs
  const openTickets = tickets.filter((t) => t.status !== "Zamknięte").length;
  const closedTickets = tickets.filter((t) => t.status === "Zamknięte").length;

  const avgResolution = useMemo(() => {
    const closed = tickets.filter((t) => t.status === "Zamknięte");
    if (closed.length === 0) return "N/D";
    // Without a closed_at column, we can't calculate exact resolution time
    return "N/D";
  }, [tickets]);

  const completedTasks = tasks.filter((t) => t.status === "done").length;

  if (!isClient) return <Navigate to="/" replace />;

  const ticketStatusBadge = (status: string) => {
    if (status === "Zamknięte")
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Zamknięte</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Otwarte</Badge>;
  };

  const kpis = [
    { title: "Otwarte zgłoszenia", value: openTickets, icon: FileText, color: "bg-amber-500/10" },
    { title: "Rozwiązane", value: closedTickets, icon: CheckCircle2, color: "bg-emerald-500/10" },
    { title: "Śr. czas rozwiązania", value: avgResolution, icon: Clock, color: "bg-blue-500/10" },
    { title: "Ukończone zadania", value: completedTasks, icon: ListChecks, color: "bg-primary/10" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                Raport miesięczny — {MONTH_NAMES[selectedDate.month]} {selectedDate.year}
              </h1>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {profile?.full_name && (
              <p className="text-sm text-muted-foreground mt-1">{profile.full_name}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Wygenerowano: {formatDate(new Date())}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zgłoszenia</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Brak zgłoszeń w wybranym miesiącu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Czas rozwiązania</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{ticketStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ukończone zadania</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.filter((t) => t.status === "done").length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Brak ukończonych zadań w wybranym miesiącu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zadanie</TableHead>
                    <TableHead>Data ukończenia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks
                    .filter((t) => t.status === "done")
                    .map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.status_updated_at
                            ? formatDate(new Date(t.status_updated_at))
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

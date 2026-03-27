import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameMonth, isSameDay, isToday,
} from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground",
};

type ViewMode = "month" | "week";

const STORAGE_KEY = "calendar-view-mode";

export default function TeamCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "week" ? "week" : "month";
    } catch {
      return "month";
    }
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, viewMode); } catch {}
  }, [viewMode]);

  // Compute date range for query based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    };
  }, [currentDate, viewMode]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["calendar-tasks", format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, priority, type")
        .gte("due_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("due_date", format(dateRange.end, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled")
        .order("priority");
      return data || [];
    },
  });

  // Navigation handlers
  const goBack = () => {
    if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const goForward = () => {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  // Header label
  const headerLabel = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const sameMonth = isSameMonth(start, end);
      if (sameMonth) {
        return `${format(start, "d")}–${format(end, "d LLLL yyyy", { locale: pl })}`;
      }
      return `${format(start, "d MMM", { locale: pl })} – ${format(end, "d MMM yyyy", { locale: pl })}`;
    }
    return format(currentDate, "LLLL yyyy", { locale: pl });
  }, [currentDate, viewMode]);

  // Month view data
  const calendarDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  const getTasksForDay = (date: Date) =>
    tasks.filter((t: any) => t.due_date && isSameDay(new Date(t.due_date), date));

  const dayNames = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

  return (
    <AppLayout title="Kalendarz">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center capitalize">
              {headerLabel}
            </h2>
            <Button variant="outline" size="icon" onClick={goForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => { if (v) setViewMode(v as ViewMode); }}
              className="border border-border rounded-lg"
            >
              <ToggleGroupItem value="month" aria-label="Widok miesięczny" className="gap-1.5 text-xs px-3">
                <CalendarDays className="h-3.5 w-3.5" />
                Miesiąc
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Widok tygodniowy" className="gap-1.5 text-xs px-3">
                <CalendarRange className="h-3.5 w-3.5" />
                Tydzień
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={goToday}>
              Dzisiaj
            </Button>
          </div>
        </div>

        {/* Views */}
        {viewMode === "week" ? (
          <CalendarWeekView currentDate={currentDate} tasks={tasks} />
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {dayNames.map((d) => (
                  <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayTasks = getTasksForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const today = isToday(day);

                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                        !isCurrentMonth ? "bg-muted/30" : ""
                      } ${today ? "bg-primary/5" : ""}`}
                    >
                      <div className={`text-sm mb-1 ${
                        today
                          ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center font-bold"
                          : isCurrentMonth
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                      }`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map((t: any) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-accent/50 truncate cursor-pointer hover:bg-accent"
                            title={t.title}
                            onClick={() => navigate(`/tasks/${t.id}`)}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[t.priority] || "bg-muted-foreground"}`} />
                            <span className="truncate text-foreground">{t.title}</span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} więcej</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

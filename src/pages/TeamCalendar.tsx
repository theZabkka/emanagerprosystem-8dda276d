import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { mockTasks } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { pl } from "date-fns/locale";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground",
};

export default function TeamCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tasks = [] } = useQuery({
    queryKey: ["calendar-tasks", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
      const { data } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, priority, type")
        .gte("due_date", format(start, "yyyy-MM-dd"))
        .lte("due_date", format(end, "yyyy-MM-dd"))
        .not("status", "eq", "cancelled")
        .order("priority");
      return data || [];
    },
  });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getTasksForDay = (date: Date) =>
    tasks.filter((t: any) => t.due_date && isSameDay(new Date(t.due_date), date));

  const dayNames = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

  return (
    <AppLayout title="Kalendarz">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
              {format(currentMonth, "LLLL yyyy", { locale: pl })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            Dzisiaj
          </Button>
        </div>

        {/* Calendar grid */}
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
                const isCurrentMonth = isSameMonth(day, currentMonth);
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
      </div>
    </AppLayout>
  );
}

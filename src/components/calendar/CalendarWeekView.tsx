import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format, addDays, startOfWeek, isSameDay, isToday, getHours,
} from "date-fns";
import { pl } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00

interface CalendarTask {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
  type: string | null;
}

interface CalendarWeekViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
}

export function CalendarWeekView({ currentDate, tasks }: CalendarWeekViewProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getTasksForDay = (date: Date) =>
    tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), date));

  // Since tasks only have due_date (no time), check if it has a time component
  const hasTime = (dueDateStr: string) => {
    // due_date from DB is "yyyy-MM-dd" (no time) — all tasks are all-day
    return dueDateStr.includes("T") && !dueDateStr.endsWith("T00:00:00");
  };

  const splitTasks = (dayTasks: CalendarTask[]) => {
    const allDay: CalendarTask[] = [];
    const timed: (CalendarTask & { hour: number })[] = [];
    dayTasks.forEach((t) => {
      if (t.due_date && hasTime(t.due_date)) {
        const h = getHours(new Date(t.due_date));
        timed.push({ ...t, hour: h });
      } else {
        allDay.push(t);
      }
    });
    return { allDay, timed };
  };

  const handleClick = (taskId: string) => navigate(`/tasks/${taskId}`);

  const TaskChip = ({ task, size = "sm" }: { task: CalendarTask; size?: "sm" | "md" }) => (
    <div
      className={`flex items-center gap-1.5 rounded cursor-pointer transition-colors hover:bg-accent border border-border/50 bg-accent/40 ${
        size === "md" ? "px-2 py-1.5" : "px-1.5 py-0.5"
      }`}
      onClick={() => handleClick(task.id)}
      title={task.title}
    >
      <span
        className={`shrink-0 rounded-full ${
          size === "md" ? "w-2 h-2" : "w-1.5 h-1.5"
        } ${PRIORITY_COLORS[task.priority] || "bg-muted-foreground"}`}
      />
      <span className={`truncate text-foreground ${size === "md" ? "text-xs" : "text-[10px]"}`}>
        {task.title}
      </span>
    </div>
  );

  // ─── MOBILE: Agenda view ───
  if (isMobile) {
    return (
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {weekDays.map((day) => {
            const dayTasks = getTasksForDay(day);
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className={`p-3 ${today ? "bg-primary/5" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-sm font-semibold ${
                      today
                        ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(day, "EEEE", { locale: pl })}
                  </span>
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">Brak zadań</p>
                ) : (
                  <div className="space-y-1">
                    {dayTasks.map((t) => (
                      <TaskChip key={t.id} task={t} size="md" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // ─── DESKTOP: 7-column weekly grid ───
  return (
    <Card>
      <CardContent className="p-0">
        {/* Day headers with dates */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="border-r border-border" />
          {weekDays.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`px-2 py-2 text-center border-r border-border last:border-r-0 ${
                  today ? "bg-primary/5" : ""
                }`}
              >
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                  {format(day, "EEE", { locale: pl })}
                </div>
                <div
                  className={`text-sm mt-0.5 ${
                    today
                      ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto font-bold"
                      : "text-foreground font-medium"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day zone */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b-2 border-border bg-muted/20">
          <div className="border-r border-border px-1 py-2 flex items-start justify-end">
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              Cały dzień
            </span>
          </div>
          {weekDays.map((day) => {
            const { allDay } = splitTasks(getTasksForDay(day));
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[48px] p-1 border-r border-border last:border-r-0 space-y-0.5 ${
                  today ? "bg-primary/5" : ""
                }`}
              >
                {allDay.slice(0, 4).map((t) => (
                  <TaskChip key={t.id} task={t} />
                ))}
                {allDay.length > 4 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{allDay.length - 4}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Hourly grid */}
        <div className="max-h-[480px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50"
            >
              <div className="border-r border-border px-1 py-2 flex items-start justify-end">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              {weekDays.map((day) => {
                const { timed } = splitTasks(getTasksForDay(day));
                const hourTasks = timed.filter((t) => t.hour === hour);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[44px] p-0.5 border-r border-border/50 last:border-r-0 ${
                      today ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {hourTasks.map((t) => (
                      <TaskChip key={t.id} task={t} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

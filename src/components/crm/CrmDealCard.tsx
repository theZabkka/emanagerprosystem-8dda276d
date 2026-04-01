import { memo } from "react";
import { format, isPast } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, BellRing, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CrmDeal } from "@/hooks/useCrmData";

const AVATAR_COLORS = [
  "bg-rose-600", "bg-blue-600", "bg-purple-600", "bg-amber-600", "bg-teal-600", "bg-indigo-600",
];

interface Props {
  deal: CrmDeal;
  labels?: Array<{ id: string; name: string; color: string }>;
  onReminderToggle: (id: string, active: boolean) => void;
  onClick: () => void;
}

export const CrmDealCard = memo(function CrmDealCard({ deal, labels, onReminderToggle, onClick }: Props) {
  const assignedName = deal.profiles?.full_name || null;
  const initials = assignedName
    ? assignedName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : null;
  const colorIdx = assignedName ? assignedName.charCodeAt(0) % AVATAR_COLORS.length : 0;

  const isOverdue = deal.due_date ? isPast(new Date(deal.due_date)) : false;
  const reminderOverdue =
    deal.reminder_active && deal.reminder_trigger_date && isPast(new Date(deal.reminder_trigger_date));

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border/60 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer space-y-2",
        deal.reminder_active && !reminderOverdue && "border-primary/30 bg-primary/[0.02]",
        reminderOverdue && "border-destructive/50 bg-destructive/5",
        isOverdue && !reminderOverdue && "border-destructive/40"
      )}
    >
      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span
              key={l.id}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">{deal.title}</p>

      {/* Client name */}
      {deal.clients?.name && (
        <span className="text-[10px] text-muted-foreground">🏢 {deal.clients.name}</span>
      )}

      {/* Date with overdue indicator */}
      {deal.due_date && (
        <div className="flex items-center gap-1">
          {isOverdue && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
          <span className={cn("text-[11px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
            {format(new Date(deal.due_date), "dd.MM.yyyy HH:mm", { locale: pl })}
          </span>
        </div>
      )}

      {/* Bottom row: avatar + bell */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
        {initials ? (
          <Avatar className="h-6 w-6">
            <AvatarFallback className={cn("text-[10px] text-white font-medium", AVATAR_COLORS[colorIdx])}>
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReminderToggle(deal.id, !deal.reminder_active);
          }}
          className={cn(
            "p-1 rounded-md transition-colors",
            isOverdue
              ? "text-destructive hover:bg-destructive/10 animate-pulse"
              : deal.reminder_active
                ? reminderOverdue
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted"
          )}
          title={isOverdue ? "Termin minął!" : deal.reminder_active ? "Wyłącz przypomnienie" : "Włącz przypomnienie (10 min)"}
        >
          {deal.reminder_active || isOverdue ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
});

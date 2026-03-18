import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
  id: string;
  title: string;
  priority?: string;
}

interface TaskListCardProps {
  title: string;
  tasks: TaskItem[];
  emptyMessage: string;
  badgeLabel?: string;
  badgeVariant?: "outline" | "destructive" | "default" | "secondary";
}

export function TaskListCard({ title, tasks, emptyMessage, badgeLabel, badgeVariant = "outline" }: TaskListCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.title}</span>
                <Badge variant={badgeVariant} className="text-xs">
                  {badgeLabel || t.priority}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

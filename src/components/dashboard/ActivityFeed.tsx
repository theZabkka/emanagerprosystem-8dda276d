import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ActivityItem {
  id: string;
  action: string;
  entity_name?: string;
  created_at: string;
  profiles?: { full_name?: string } | null;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ostatnia aktywność</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {(act.profiles?.full_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{act.profiles?.full_name}</span>{" "}
                    <span className="text-muted-foreground">{act.action}</span>{" "}
                    <span className="font-medium">{act.entity_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(act.created_at).toLocaleString("pl-PL")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Brak aktywności.</p>
        )}
      </CardContent>
    </Card>
  );
}

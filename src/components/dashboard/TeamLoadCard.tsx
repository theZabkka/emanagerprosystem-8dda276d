import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  name: string;
  tasks?: number;
  hours?: number;
  rate?: string;
}

interface TeamLoadCardProps {
  title: string;
  members: TeamMember[];
  emptyMessage: string;
  variant: "load" | "quality";
}

export function TeamLoadCard({ title, members, emptyMessage, variant }: TeamLoadCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{m.name}</span>
                {variant === "load" ? (
                  <span className="text-muted-foreground">{m.tasks} zadań · {m.hours}h</span>
                ) : (
                  <Badge variant="outline">{m.rate}</Badge>
                )}
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

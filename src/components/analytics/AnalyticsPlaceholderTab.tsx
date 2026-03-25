import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
}

export function AnalyticsPlaceholderTab({ icon: Icon, label }: Props) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="p-4 rounded-2xl bg-muted">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-foreground">Moduł analityki „{label}"</p>
          <p className="text-sm text-muted-foreground">w przygotowaniu…</p>
        </div>
      </CardContent>
    </Card>
  );
}

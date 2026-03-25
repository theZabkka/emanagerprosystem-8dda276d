import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  navigateTo?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color, navigateTo }: StatCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className={navigateTo ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}
      onClick={() => navigateTo && navigate(navigateTo)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color || "bg-primary/10"}`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

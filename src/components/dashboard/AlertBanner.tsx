import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface AlertBannerProps {
  color: "red" | "orange";
  icon: React.ElementType;
  text: string;
  actionText?: string;
  onAction?: () => void;
}

export function AlertBanner({ color, icon: Icon, text, actionText, onAction }: AlertBannerProps) {
  const bgClass = color === "red"
    ? "bg-destructive/10 border-destructive/30 text-destructive"
    : "bg-warning/10 border-warning/30 text-warning-foreground";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${bgClass}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1">{text}</span>
      {actionText && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAction}>
          {actionText} <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

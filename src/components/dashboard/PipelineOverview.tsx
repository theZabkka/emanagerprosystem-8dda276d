import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PipelineStage {
  label: string;
  value: string;
  count: number;
  color: string;
}

interface PipelineOverviewProps {
  stages: PipelineStage[];
}

export function PipelineOverview({ stages }: PipelineOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lejek sprzedaży</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="text-sm">{stage.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{stage.value}</span>
                <span className="text-xs text-muted-foreground ml-2">({stage.count})</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function KanbanSkeleton() {
  const columns = [4, 3, 5, 2, 3];
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((cardCount, i) => (
        <div key={i} className="min-w-[280px] flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: cardCount }).map((_, j) => (
            <Card key={j}>
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

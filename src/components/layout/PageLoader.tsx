import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="w-[260px] border-r border-border p-4 space-y-4 hidden md:block">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-6 flex items-center">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

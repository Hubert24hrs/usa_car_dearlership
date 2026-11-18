import { Skeleton } from "@/components/ui/skeleton";

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Loading vehicles">
      <Skeleton className="mb-2 h-4 w-48" />
      <Skeleton className="mb-6 h-8 w-72" />
      <div className="grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <VehicleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

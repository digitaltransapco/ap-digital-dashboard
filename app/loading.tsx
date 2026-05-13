import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header skeleton */}
      <div className="bg-white border-b border-[var(--border)] px-6 py-5">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-14 rounded-full bg-gray-200" />
              <div>
                <Skeleton className="h-3 w-56 mb-2" />
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-3 w-48 mt-2" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <Skeleton className="h-3 w-20 ml-auto" />
              <Skeleton className="h-4 w-36 ml-auto" />
            </div>
          </div>
          <Skeleton className="h-2 w-full mt-4 rounded-full" />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        {/* KPI row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-14" />
            </Card>
          ))}
        </div>

        {/* Leaderboard skeleton */}
        <Skeleton className="h-64 w-full rounded-xl" />

        {/* BI callouts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        {/* Division grid skeleton */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

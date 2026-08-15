import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route skeleton — mirrors the common page scaffold
 * (header + KPI row + primary panel + side list) so slow-loading
 * routes feel like the real content is arriving, not spinning.
 *
 * Only shown when a route takes >1s to load (router `pendingMs`),
 * so users on fast connections never see it.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading content…</span>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-3 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart + side list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16" />
              ))}
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow space-y-3">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal centered boot skeleton for the app shell while auth
 * hydrates on a slow connection.
 */
export function BootSkeleton() {
  return (
    <div className="min-h-screen w-full bg-surface-base flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4" aria-busy="true">
        <Skeleton className="h-3 w-24 mx-auto" />
        <Skeleton className="h-6 w-56 mx-auto" />
        <Skeleton className="h-32 w-full" />
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-healthy pulse-healthy" />
          Restoring session
        </div>
      </div>
    </div>
  );
}
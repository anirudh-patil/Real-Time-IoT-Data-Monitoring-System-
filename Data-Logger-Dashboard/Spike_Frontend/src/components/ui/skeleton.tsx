import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-elevated/60 border border-surface-stroke/40",
        "motion-safe:before:absolute motion-safe:before:inset-0",
        "motion-safe:before:-translate-x-full motion-safe:before:animate-[shimmer_1.6s_infinite]",
        "motion-safe:before:bg-gradient-to-r motion-safe:before:from-transparent motion-safe:before:via-white/[0.06] motion-safe:before:to-transparent",
        "motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };

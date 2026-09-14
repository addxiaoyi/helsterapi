import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  /** Animation variant: pulse, shimmer, none */
  variant?: "pulse" | "shimmer" | "none";
}

export function Skeleton({ className, variant = "shimmer" }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "relative overflow-hidden bg-ink/[0.06]",
        variant === "pulse" && "animate-pulse",
        variant === "none" && "",
        variant === "shimmer" &&
          "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-ink/[0.08] after:to-transparent",
        className,
      )}
    />
  );
}

/** Preset: text line */
export function SkeletonText({
  className,
  width,
}: {
  className?: string;
  width?: string;
}) {
  return <Skeleton className={cn("h-3 w-full", className)} />;
}

/** Preset: card with multiple lines */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="border border-ink/10 bg-paper p-6">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

/** Preset: table row */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-ink/5 py-4 px-6">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === 0 ? "w-1/4" : "flex-1")}
        />
      ))}
    </div>
  );
}

/** Preset: full table */
export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="border border-ink/10 bg-paper">
      <div className="flex items-center gap-4 border-b border-ink/10 bg-paper p-4">
        <Skeleton className="h-4 w-1/3" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </div>
  );
}

/** Preset: stat card with icon + label + big number */
export function SkeletonStat() {
  return (
    <div className="border border-ink/10 bg-paper p-6">
      <Skeleton className="mb-10 h-4 w-4" />
      <Skeleton className="mb-2 h-3 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

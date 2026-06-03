import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-white/[0.04]", className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-white/5">
      <Skeleton className="w-12 h-12 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}

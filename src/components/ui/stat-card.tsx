import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  className?: string;
  accent?: "acid" | "blue" | "hot" | "amber" | "green" | "violet";
}

const accentClass = {
  acid:  "text-[color:var(--color-acid)]",
  blue:  "text-[color:var(--color-blue)]",
  hot:   "text-[color:var(--color-hot)]",
  amber: "text-[color:var(--color-amber)]",
  green: "text-[color:var(--color-green)]",
  violet:"text-[color:var(--color-violet)]",
};

export function StatCard({ label, value, delta, hint, className, accent }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 p-5 backdrop-blur",
      "hover:border-white/15 transition-colors",
      className
    )}>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)] font-medium">{label}</div>
      <div className={cn("font-display text-4xl mt-2 leading-none", accent ? accentClass[accent] : undefined)}>{value}</div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn("font-medium", delta.positive ? "text-[color:var(--color-green)]" : "text-[color:var(--color-hot)]")}>
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        )}
        {hint && <span className="text-[color:var(--color-faint)]">{hint}</span>}
      </div>
    </div>
  );
}

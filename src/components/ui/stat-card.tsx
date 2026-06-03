import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  className?: string;
  icon?: ReactNode;
  iconTone?: "a" | "b" | "p" | "g";
  /** @deprecated use iconTone — kept for existing pages */
  accent?: "acid" | "blue" | "hot" | "amber" | "green" | "violet";
}

const accentToTone: Record<NonNullable<StatCardProps["accent"]>, "a" | "b" | "p" | "g"> = {
  acid: "a", blue: "b", hot: "p", amber: "p", green: "g", violet: "b",
};

const iconToneClass = {
  a: "bg-[color:var(--color-acid)]/12 text-[color:var(--color-acid)]",
  b: "bg-[color:var(--color-blue)]/12 text-[color:var(--color-blue)]",
  p: "bg-[color:var(--color-hot)]/12 text-[color:var(--color-hot)]",
  g: "bg-[color:var(--color-green)]/12 text-[color:var(--color-green)]",
};

export function StatCard({ label, value, delta, hint, className, icon, iconTone, accent }: StatCardProps) {
  const tone = iconTone ?? (accent ? accentToTone[accent] : "a");
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-card)] p-[17px]", className)}>
      <div className="mb-3 flex items-center justify-between">
        {icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-[9px] text-[15px]", iconToneClass[tone])}>
            {icon}
          </div>
        )}
        {delta && (
          <span className={cn(
            "rounded-md px-[7px] py-[3px] font-mono text-[11px] font-semibold",
            delta.positive !== false ? "bg-[color:var(--color-green)]/12 text-[color:var(--color-green)]" : "bg-[color:var(--color-hot)]/12 text-[color:var(--color-hot)]"
          )}>
            {delta.value}
          </span>
        )}
      </div>
      <div className="font-display text-[32px] leading-none">{value}</div>
      <div className="mt-1 font-mono text-[11.5px] uppercase tracking-[0.05em] text-[color:var(--color-muted)]">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-[color:var(--color-faint)]">{hint}</div>}
    </div>
  );
}

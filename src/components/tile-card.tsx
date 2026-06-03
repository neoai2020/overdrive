import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface TileCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  meta?: string;
  accent?: "acid" | "blue" | "amber" | "violet";
  className?: string;
}

const iconBg = {
  acid:   "bg-[color:var(--color-acid)]/12 text-[color:var(--color-acid)]",
  blue:   "bg-[color:var(--color-blue)]/12 text-[color:var(--color-blue)]",
  amber:  "bg-[color:var(--color-amber)]/12 text-[color:var(--color-amber)]",
  violet: "bg-[color:var(--color-violet)]/12 text-[color:var(--color-violet)]",
};

/** Matches prototype `.tool` cards. */
export function TileCard({ icon: Icon, title, description, href, meta, accent = "acid", className }: TileCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-card)] p-[22px] transition-all",
        "hover:-translate-y-[3px] hover:border-[color:var(--color-faint)]",
        className
      )}
    >
      <ChevronRight className="absolute right-[22px] top-[22px] h-4 w-4 text-[color:var(--color-faint)]" />
      <div className={cn("mb-[14px] flex h-[42px] w-[42px] items-center justify-center rounded-[11px] text-[20px]", iconBg[accent])}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h4 className="mb-[5px] text-base font-bold">{title}</h4>
      <p className="text-[13px] leading-relaxed text-[color:var(--color-muted)]">{description}</p>
      {meta && <div className="mt-4 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">{meta}</div>}
    </Link>
  );
}

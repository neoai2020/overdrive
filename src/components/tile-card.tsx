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

const accentClass = {
  acid:   "from-[color:var(--color-acid)]/15 to-transparent text-[color:var(--color-acid)]",
  blue:   "from-[color:var(--color-blue)]/15 to-transparent text-[color:var(--color-blue)]",
  amber:  "from-[color:var(--color-amber)]/15 to-transparent text-[color:var(--color-amber)]",
  violet: "from-[color:var(--color-violet)]/15 to-transparent text-[color:var(--color-violet)]",
};

export function TileCard({ icon: Icon, title, description, href, meta, accent = "acid", className }: TileCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 p-5 transition-all overflow-hidden",
        "hover:border-white/20 hover:bg-[color:var(--color-card2)]/80",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none", accentClass[accent])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-9 h-9 rounded-md inline-flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors", accentClass[accent].split(" ").pop())}>
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <ChevronRight className="w-4 h-4 text-[color:var(--color-faint)] group-hover:text-[color:var(--color-ink)] group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="font-semibold text-sm mb-1">{title}</div>
        <div className="text-xs text-[color:var(--color-muted)] leading-relaxed">{description}</div>
        {meta && <div className="mt-4 text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">{meta}</div>}
      </div>
    </Link>
  );
}

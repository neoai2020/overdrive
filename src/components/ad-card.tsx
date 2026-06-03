"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { Play } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { Ad, AdVersion } from "@/lib/types/database";

interface AdCardProps {
  ad: Ad & { current_version?: AdVersion | null };
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function AdCard({ ad, selected, onSelect, onClick, compact }: AdCardProps) {
  const v = ad.current_version;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[11px] border border-[color:var(--color-line)] bg-gradient-to-br from-[#16161e] to-[#0b0b0f] transition-all",
        selected ? "border-[color:var(--color-acid)] z-[3]" : "hover:scale-[1.04] hover:border-[color:var(--color-acid)] hover:z-[3]"
      )}
    >
      {onSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "absolute left-[7px] top-[7px] z-10 hidden h-4 w-4 items-center justify-center rounded-[5px] bg-[color:var(--color-acid)] text-[10px] font-extrabold text-black",
            selected && "flex"
          )}
        >
          ✓
        </button>
      )}
      <div className="relative aspect-[9/16] overflow-hidden">
        {v?.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbnail_url} alt={v?.hook ?? ad.name ?? "ad"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color:var(--color-card3)] to-black">
            <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">No preview</span>
          </div>
        )}
        {!compact && (
          <div className="absolute right-[7px] top-[7px]">
            <StatusPill status={ad.status} />
          </div>
        )}
        <div className="absolute inset-0 m-auto flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/16 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
          <div className="line-clamp-2 text-[9px] font-bold leading-tight">{v?.hook ?? ad.name ?? "Untitled"}</div>
          {!compact && (
            <div className="mt-0.5 font-mono text-[7px] uppercase text-[color:var(--color-acid)]">
              {v?.style?.replace(/_/g, " ") ?? "ugc"}
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="hidden p-3 space-y-1 sm:block">
          <div className="text-xs text-[color:var(--color-muted)]">{formatRelativeTime(ad.created_at)}</div>
        </div>
      )}
    </div>
  );
}

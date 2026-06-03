"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { Play, MoreHorizontal } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { Ad, AdVersion } from "@/lib/types/database";

interface AdCardProps {
  ad: Ad & { current_version?: AdVersion | null };
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
}

export function AdCard({ ad, selected, onSelect, onClick }: AdCardProps) {
  const v = ad.current_version;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border bg-[color:var(--color-card)] overflow-hidden cursor-pointer transition-all",
        selected
          ? "border-[color:var(--color-acid)] ring-2 ring-[color:var(--color-acid)]/30"
          : "border-white/8 hover:border-white/20"
      )}
    >
      {onSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 transition-all",
            selected
              ? "bg-[color:var(--color-acid)] border-[color:var(--color-acid)]"
              : "border-white/30 bg-black/40 opacity-0 group-hover:opacity-100"
          )}
        />
      )}
      <div className="aspect-[9/16] bg-black relative overflow-hidden">
        {v?.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbnail_url} alt={v?.hook ?? ad.name ?? "ad"} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[color:var(--color-card3)] to-black flex items-center justify-center">
            <span className="text-xs text-[color:var(--color-faint)] uppercase tracking-wider">No preview</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/95 to-transparent" />
        <div className="absolute top-2 right-2"><StatusPill status={ad.status} /></div>
        {v?.length_seconds && (
          <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded">
            {v.length_seconds}s
          </div>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
        >
          <Play className="w-5 h-5 ml-0.5 fill-white" />
        </button>
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium line-clamp-2 leading-snug">{v?.hook ?? ad.name ?? "Untitled ad"}</div>
        <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--color-muted)]">
          <span className="truncate">{v?.style?.replace(/_/g, " ") ?? "—"}</span>
          <span className="shrink-0">{formatRelativeTime(ad.created_at)}</span>
        </div>
      </div>
      <button onClick={(e) => e.stopPropagation()} className="absolute top-2 right-12 z-10 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity">
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
}

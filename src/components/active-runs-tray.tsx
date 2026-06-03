"use client";

import * as React from "react";
import { Activity, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useActiveRuns } from "@/lib/hooks/use-active-runs";
import Link from "next/link";

export function ActiveRunsTray() {
  const { runs } = useActiveRuns();
  const count = runs.length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "relative h-9 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-2 transition-colors",
            count > 0
              ? "border-[color:var(--color-amber)]/40 bg-[color:var(--color-amber)]/10 text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)]/15"
              : "border-white/10 bg-white/[0.03] text-[color:var(--color-muted)] hover:bg-white/[0.06]"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Runs</span>
          <span className="font-mono">{count}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[340px] rounded-lg border border-white/10 bg-[color:var(--color-card2)] shadow-2xl p-1"
        >
          <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider">Active runs</div>
            <span className="text-[10px] text-[color:var(--color-faint)] font-mono">{count} in flight</span>
          </div>
          {count === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-[color:var(--color-muted)]">No runs in flight. Start a batch.</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/batches/${r.id}`}
                    className="block px-3 py-3 hover:bg-white/[0.04] rounded-md group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      <Loader2 className="w-3.5 h-3.5 text-[color:var(--color-amber)] animate-spin-acid shrink-0" />
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-1.5">
                      <div className="h-full bg-[color:var(--color-amber)]" style={{ width: `${r.progress_pct ?? 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">
                      <span>{r.progress_step ?? "queued"}</span>
                      <span className="font-mono">{r.progress_pct ?? 0}%</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

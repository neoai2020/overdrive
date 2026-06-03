import { cn } from "@/lib/utils";

const tones = {
  live:    "bg-[color:var(--color-green)]/15 text-[color:var(--color-green)] border-[color:var(--color-green)]/30",
  draft:   "bg-white/5 text-[color:var(--color-muted)] border-white/10",
  generating: "bg-[color:var(--color-amber)]/15 text-[color:var(--color-amber)] border-[color:var(--color-amber)]/30",
  review:  "bg-[color:var(--color-blue)]/15 text-[color:var(--color-blue)] border-[color:var(--color-blue)]/30",
  paused:  "bg-[color:var(--color-hot)]/15 text-[color:var(--color-hot)] border-[color:var(--color-hot)]/30",
  ready:   "bg-[color:var(--color-acid)]/15 text-[color:var(--color-acid)] border-[color:var(--color-acid)]/30",
  failed:  "bg-[color:var(--color-hot)]/15 text-[color:var(--color-hot)] border-[color:var(--color-hot)]/30",
  queued:  "bg-white/5 text-[color:var(--color-muted)] border-white/10",
  archived: "bg-white/5 text-[color:var(--color-faint)] border-white/5",
} as const;

type Tone = keyof typeof tones;

const statusToTone: Record<string, Tone> = {
  live: "live", draft: "draft", generating: "generating", review: "review",
  paused: "paused", ready: "ready", failed: "failed", queued: "queued",
  archived: "archived", needs_review: "review",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone = statusToTone[status] ?? "draft";
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border",
      tones[tone], className
    )}>
      {(tone === "live" || tone === "generating") && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />}
      {label}
    </span>
  );
}

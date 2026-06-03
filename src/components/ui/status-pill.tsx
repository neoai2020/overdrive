import { cn } from "@/lib/utils";

const tones = {
  live:       "bg-[color:var(--color-green)]/13 text-[color:var(--color-green)]",
  draft:      "bg-[color:var(--color-muted)]/14 text-[color:var(--color-muted)]",
  generating: "bg-[color:var(--color-amber)]/14 text-[color:var(--color-amber)]",
  review:     "bg-[color:var(--color-blue)]/16 text-[#8fb4ff]",
  paused:     "bg-[color:var(--color-hot)]/13 text-[color:var(--color-hot)]",
  ready:      "bg-[color:var(--color-green)]/13 text-[color:var(--color-green)]",
  failed:     "bg-[color:var(--color-hot)]/13 text-[color:var(--color-hot)]",
  queued:     "bg-[color:var(--color-muted)]/14 text-[color:var(--color-muted)]",
  archived:   "bg-[color:var(--color-muted)]/14 text-[color:var(--color-faint)]",
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
      "inline-flex items-center gap-1.5 rounded-[7px] px-[9px] py-[5px] font-mono text-[10px] font-semibold capitalize",
      tones[tone], className
    )}>
      {(tone === "live" || tone === "generating") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {label}
    </span>
  );
}

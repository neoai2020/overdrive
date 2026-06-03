"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeroCreateProps {
  onNewCampaign: () => void;
  onGenerateAds: () => void;
}

export function HeroCreate({ onNewCampaign, onGenerateAds }: HeroCreateProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState("");

  function onReadOffer() {
    const q = url.trim() ? `?url=${encodeURIComponent(url.trim())}` : "";
    router.push(`/app/research${q}`);
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[color:var(--color-line)] bg-gradient-to-br from-[color:var(--color-blue)]/10 to-[color:var(--color-hot)]/6 p-[26px] mb-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.12),transparent_70%)]"
      />
      <div className="relative z-[2]">
        <div className="mb-[9px] font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-acid)]">
          Start something
        </div>
        <h2 className="mb-[5px] text-[25px] font-extrabold tracking-[-0.01em]">
          Turn one offer into a flood of winners.
        </h2>
        <p className="mb-[18px] max-w-[50ch] text-[color:var(--color-muted)]">
          Drop an offer link to spin up a campaign, or jump straight into a batch. The engine handles hooks,
          scripts, talent, voice and edit.
        </p>
        <div className="flex max-w-[660px] gap-[10px]">
          <div className="flex flex-1 items-center gap-[10px] rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-4 py-[13px]">
            <span className="font-mono text-[color:var(--color-faint)]">🔗</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onReadOffer()}
              placeholder="myoffer.com/vsl-funnel"
              className="w-full bg-transparent font-mono text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-faint)]"
            />
          </div>
          <button
            type="button"
            onClick={onReadOffer}
            className="btn-proto btn-proto-acid shrink-0"
          >
            Read offer →
          </button>
        </div>
        <div className="mt-[14px] flex flex-wrap gap-[10px]">
          <QuickChip onClick={onNewCampaign}>◎ New campaign</QuickChip>
          <QuickChip onClick={onGenerateAds}>⚡ Generate ads</QuickChip>
          <QuickChip asLink href="/app/research">🔬 Research an offer</QuickChip>
          <QuickChip asLink href="/app/templates">❖ Browse templates</QuickChip>
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  children,
  onClick,
  asLink,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  asLink?: boolean;
  href?: string;
}) {
  const cls = cn(
    "cursor-pointer rounded-[9px] border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-[13px] py-2 text-[12.5px] font-semibold text-[color:var(--color-muted)] transition-colors",
    "hover:border-[color:var(--color-acid)] hover:text-[color:var(--color-ink)]"
  );
  if (asLink && href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

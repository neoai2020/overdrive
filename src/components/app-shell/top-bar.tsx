"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveRunsTray } from "@/components/active-runs-tray";

interface Crumb { label: string; href: string }

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] !== "app") return [];
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/app" }];
  let href = "/app";
  const labels: Record<string, string> = {
    campaigns: "Campaigns", ads: "Ads", batches: "Batches",
    research: "Research", templates: "Templates", voice: "Swipe Vault",
    lab: "Lab", learn: "Learn", integrations: "Integrations", settings: "Settings",
    admin: "Admin",
  };
  for (let i = 1; i < segs.length; i++) {
    href += `/${segs[i]}`;
    const isId = /^[0-9a-f-]{6,}$/i.test(segs[i]);
    crumbs.push({ label: isId ? segs[i].slice(0, 8) + "…" : (labels[segs[i]] ?? segs[i]), href });
  }
  return crumbs;
}

interface TopBarProps {
  onOpenPalette: () => void;
  onLaunchCampaignBuilder: () => void;
}

export function TopBar({ onOpenPalette, onLaunchCampaignBuilder }: TopBarProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-auto items-center gap-4 border-b border-[color:var(--color-line)] bg-[color:var(--color-bg)]/82 px-[30px] py-[14px] backdrop-blur-[12px]">
      <nav className="flex min-w-0 flex-1 items-center text-sm">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 && <ChevronRight className="mx-2 h-3.5 w-3.5 shrink-0 text-[color:var(--color-faint)]" />}
            {i === crumbs.length - 1 ? (
              <span className="truncate font-bold text-[color:var(--color-ink)]">{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <button
        type="button"
        onClick={onOpenPalette}
        className={cn(
          "hidden w-[230px] items-center gap-[9px] rounded-[10px] border border-[color:var(--color-line)] bg-[color:var(--color-card)] px-[14px] py-[9px] text-left md:flex"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[color:var(--color-faint)]" />
        <span className="flex-1 text-[13px] text-[color:var(--color-faint)]">Search…</span>
        <kbd className="rounded border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-faint)]">⌘K</kbd>
      </button>

      <ActiveRunsTray />

      <button type="button" onClick={onLaunchCampaignBuilder} className="btn-proto btn-proto-acid btn-proto-sm">
        <Plus className="h-4 w-4" />
        New campaign
      </button>
    </header>
  );
}

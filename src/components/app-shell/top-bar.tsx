"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Plus, ChevronRight, ChevronDown, Megaphone, Sparkles } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ActiveRunsTray } from "@/components/active-runs-tray";

interface Crumb { label: string; href: string }

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] !== "app") return [];
  const crumbs: Crumb[] = [{ label: "Home", href: "/app" }];
  let href = "/app";
  const labels: Record<string, string> = {
    campaigns: "Campaigns", ads: "Ads", batches: "Batches",
    research: "Research", templates: "Templates", voice: "Knowledge",
    lab: "Lab", learn: "Learn", integrations: "Integrations", settings: "Settings",
  };
  for (let i = 1; i < segs.length; i++) {
    href += `/${segs[i]}`;
    const isId = /^[0-9a-f-]{6,}$/i.test(segs[i]);
    crumbs.push({ label: isId ? segs[i].slice(0, 8) + "…" : (labels[segs[i]] ?? segs[i]), href });
  }
  return crumbs;
}

interface TopBarProps {
  user: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
  onOpenPalette: () => void;
  onLaunchCampaignBuilder: () => void;
  onLaunchGenerateAds: () => void;
}

export function TopBar({ user, onOpenPalette, onLaunchCampaignBuilder, onLaunchGenerateAds }: TopBarProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="h-14 border-b border-white/8 bg-[color:var(--color-bg)]/85 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm min-w-0 flex-1">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-[color:var(--color-faint)] shrink-0" />}
            {i === crumbs.length - 1 ? (
              <span className="truncate font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] truncate">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Search → opens command palette */}
      <button
        type="button"
        onClick={onOpenPalette}
        className={cn(
          "relative w-72 max-w-[40%] hidden md:flex items-center gap-3 h-9 px-3 rounded-md",
          "bg-white/[0.04] border border-white/10 text-sm text-left",
          "hover:bg-white/[0.06] hover:border-white/20 transition-colors"
        )}
      >
        <Search className="w-4 h-4 text-[color:var(--color-faint)] shrink-0" />
        <span className="flex-1 text-[color:var(--color-faint)]">Search or run a command…</span>
        <kbd className="text-[10px] font-mono text-[color:var(--color-faint)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <ActiveRunsTray />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button size="sm">
            <Plus className="w-4 h-4" /> New
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 w-56 rounded-lg border border-white/10 bg-[color:var(--color-card2)] shadow-2xl p-1"
          >
            <DropdownMenu.Item
              onSelect={onLaunchCampaignBuilder}
              className="px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer text-sm outline-none data-[highlighted]:bg-white/[0.06]"
            >
              <Megaphone className="w-4 h-4 text-[color:var(--color-acid)]" />
              <span className="flex-1">New campaign</span>
              <kbd className="text-[10px] font-mono text-[color:var(--color-faint)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘C</kbd>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onLaunchGenerateAds}
              className="px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer text-sm outline-none data-[highlighted]:bg-white/[0.06]"
            >
              <Sparkles className="w-4 h-4 text-[color:var(--color-acid)]" />
              <span className="flex-1">Generate ads</span>
              <kbd className="text-[10px] font-mono text-[color:var(--color-faint)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘G</kbd>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* User */}
      <div className="flex items-center gap-2 pl-2 ml-2 border-l border-white/8">
        <div className="w-7 h-7 rounded-full bg-[color:var(--color-acid)]/15 border border-[color:var(--color-acid)]/30 inline-flex items-center justify-center text-xs font-semibold text-[color:var(--color-acid)]">
          {(user?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[color:var(--color-muted)]" />
      </div>
    </header>
  );
}

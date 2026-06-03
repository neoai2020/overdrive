"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid, Compass, Megaphone, Layers, Boxes, Mic2, FlaskConical,
  BookOpen, FileText, Plug, Settings, Sparkles, PlusCircle,
} from "lucide-react";
import * as React from "react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: string | number;
  dot?: boolean;
  primary?: boolean;
  action?: "campaign" | "generate";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Discover",
    items: [
      { href: "#", label: "Create Campaign", icon: PlusCircle, action: "campaign" as const },
      { href: "#", label: "Generate ads", icon: Sparkles, action: "generate" as const },
      { href: "/app/research", label: "Research", icon: Compass },
      { href: "/app/templates", label: "Templates", icon: FileText },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/app/campaigns", label: "Campaigns", icon: Megaphone, dot: true },
      { href: "/app/ads", label: "Ads", icon: Layers },
      { href: "/app/batches", label: "Batches", icon: Boxes },
    ],
  },
  {
    title: "My Voice",
    items: [
      { href: "/app/voice", label: "Swipe Vault", icon: Mic2 },
      { href: "/app/lab", label: "Lab", icon: FlaskConical },
      { href: "/app/learn", label: "Learn", icon: BookOpen },
    ],
  },
];

const accountNav: NavItem[] = [
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  onCollapsedChange,
  user,
  creditsTotal = 2000,
  creditsUsed = 0,
  onLaunchCampaignBuilder,
  onLaunchGenerateAds,
}: {
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  user: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
  creditsTotal?: number;
  creditsUsed?: number;
  onLaunchCampaignBuilder: () => void;
  onLaunchGenerateAds: () => void;
}) {
  const pathname = usePathname();
  const creditsLeft = Math.max(0, creditsTotal - creditsUsed);
  const pct = creditsTotal > 0 ? Math.min(100, (creditsLeft / creditsTotal) * 100) : 0;

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  function onNavClick(item: NavItem, e: React.MouseEvent) {
    if (item.action === "campaign") {
      e.preventDefault();
      onLaunchCampaignBuilder();
    } else if (item.action === "generate") {
      e.preventDefault();
      onLaunchGenerateAds();
    }
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-y-auto border-r border-[color:var(--color-line)] bg-[color:var(--color-panel)] transition-[width] duration-200",
        collapsed ? "w-[72px] px-[10px] py-[18px]" : "w-[250px] px-[14px] py-[18px]"
      )}
    >
      {/* Brand */}
      <Link
        href="/app"
        className={cn(
          "mb-2 flex items-center gap-[10px] px-[10px] py-[6px] font-display text-[21px] tracking-[0.02em]",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="brand-mk" aria-hidden />
        {!collapsed && <span>OVERDRIVE</span>}
      </Link>

      {/* Dashboard — primary acid button (prototype `.ni.primary`) */}
      <Link
        href="/app"
        className={cn(
          "relative mb-[6px] mt-[2px] flex items-center gap-[11px] rounded-[10px] px-3 py-[9px] text-[13.5px] font-semibold transition-colors",
          collapsed && "justify-center px-0",
          pathname === "/app"
            ? "bg-[color:var(--color-acid)] text-black"
            : "bg-[color:var(--color-acid)] text-black hover:brightness-105"
        )}
        title={collapsed ? "Dashboard" : undefined}
      >
        <LayoutGrid className="h-[18px] w-[18px] shrink-0 opacity-100" strokeWidth={2} />
        {!collapsed && <span>Dashboard</span>}
      </Link>

      <nav className="flex-1 space-y-1">
        {sections.map((sec) => (
          <div key={sec.title}>
            {!collapsed && (
              <div className="px-3 pb-[7px] pt-[14px] font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-faint)]">
                {sec.title}
              </div>
            )}
            <ul className="space-y-[2px]">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const content = (
                  <>
                    <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" strokeWidth={1.75} />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge != null && (
                          <span className="ml-auto rounded-[20px] bg-[color:var(--color-card3)] px-[7px] py-[2px] font-mono text-[10px] text-[color:var(--color-muted)]">
                            {item.badge}
                          </span>
                        )}
                        {item.dot && (
                          <span className="ml-auto h-[7px] w-[7px] rounded-full bg-[color:var(--color-green)] shadow-[0_0_8px_var(--color-green)]" />
                        )}
                      </>
                    )}
                  </>
                );
                const cls = cn(
                  "relative flex items-center gap-[11px] rounded-[10px] px-3 py-[9px] text-[13.5px] font-semibold text-[color:var(--color-muted)] transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-[color:var(--color-card2)] text-[color:var(--color-ink)] before:absolute before:-left-[14px] before:top-1/2 before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:rounded-r-[3px] before:bg-[color:var(--color-acid)] before:content-['']"
                    : "hover:bg-[color:var(--color-card)] hover:text-[color:var(--color-ink)]"
                );
                if (item.action) {
                  return (
                    <li key={item.label}>
                      <button type="button" onClick={() => (item.action === "campaign" ? onLaunchCampaignBuilder() : onLaunchGenerateAds())} className={cn(cls, "w-full text-left")} title={collapsed ? item.label : undefined}>
                        {content}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={cls} title={collapsed ? item.label : undefined} onClick={(e) => onNavClick(item, e)}>
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!collapsed && (
          <div className="px-3 pb-[7px] pt-[14px] font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-faint)]">
            Account
          </div>
        )}
        <ul className="space-y-[2px]">
          {accountNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-[11px] rounded-[10px] px-3 py-[9px] text-[13.5px] font-semibold transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-[color:var(--color-card2)] text-[color:var(--color-ink)] before:absolute before:-left-[14px] before:top-1/2 before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:rounded-r-[3px] before:bg-[color:var(--color-acid)]"
                      : "text-[color:var(--color-muted)] hover:bg-[color:var(--color-card)] hover:text-[color:var(--color-ink)]"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" strokeWidth={1.75} />
                  {!collapsed && item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-h-[10px] flex-1" />

      {/* Credits meter */}
      {!collapsed && (
        <div className="mb-[10px] rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-card)] p-[13px]">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-faint)]">Credits</div>
          <div className="mb-2 h-[6px] overflow-hidden rounded-md bg-[color:var(--color-line)]">
            <div
              className="h-full bg-gradient-to-r from-[color:var(--color-acid)] to-[color:var(--color-green)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[13px] font-bold">
            {creditsLeft.toLocaleString()}{" "}
            <span className="font-medium text-[color:var(--color-muted)]">/ {creditsTotal.toLocaleString()}</span>
          </div>
          <Link href="/app/settings" className="mt-[9px] block text-center text-[12px] font-bold text-[color:var(--color-acid)]">
            Upgrade →
          </Link>
        </div>
      )}

      {/* User chip */}
      <div className={cn("flex cursor-pointer items-center gap-[10px] rounded-[10px] p-[7px] hover:bg-[color:var(--color-card)]", collapsed && "justify-center")}>
        <div className="h-[30px] w-[30px] shrink-0 rounded-full bg-gradient-to-br from-[color:var(--color-blue)] to-[color:var(--color-hot)]" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{user?.full_name ?? "Account"}</div>
            <div className="truncate text-[11px] text-[color:var(--color-faint)]">{user?.email ?? ""}</div>
          </div>
        )}
      </div>

      {/* Collapse toggle — desktop only subtle */}
      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="mt-2 hidden rounded-[10px] px-3 py-2 text-left text-[12px] text-[color:var(--color-faint)] hover:bg-[color:var(--color-card)] hover:text-[color:var(--color-ink)] lg:block"
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
    </aside>
  );
}

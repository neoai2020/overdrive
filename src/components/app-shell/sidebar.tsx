"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid, Compass, Megaphone, Layers, Boxes, Mic2, FlaskConical,
  BookOpen, FileText, Plug, Settings, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import * as React from "react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: string;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Discover",
    items: [
      { href: "/app", label: "Home", icon: LayoutGrid },
      { href: "/app/research", label: "Research", icon: Compass },
      { href: "/app/templates", label: "Templates", icon: FileText },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/app/ads", label: "Ads", icon: Layers },
      { href: "/app/batches", label: "Batches", icon: Boxes },
    ],
  },
  {
    title: "My Voice",
    items: [
      { href: "/app/voice", label: "Knowledge", icon: Mic2 },
      { href: "/app/lab", label: "Lab", icon: FlaskConical },
      { href: "/app/learn", label: "Learn", icon: BookOpen },
    ],
  },
];

const settingsNav: NavItem[] = [
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange: (c: boolean) => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "shrink-0 sticky top-0 h-screen bg-[color:var(--color-panel)]/95 border-r border-white/8 transition-[width] duration-200 ease-out flex flex-col z-30",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("px-4 h-14 flex items-center border-b border-white/8", collapsed && "justify-center px-0")}>
        <Link href="/app" className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[color:var(--color-acid)] inline-flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="font-display text-base tracking-tight">OVERDRIVE</span>}
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {sections.map((sec) => (
          <div key={sec.title}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium">
                {sec.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-white/[0.06] text-[color:var(--color-ink)]"
                          : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-white/[0.04]"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", active && "text-[color:var(--color-acid)]")} strokeWidth={1.75} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && active && <span className="ml-auto w-1 h-1 rounded-full bg-[color:var(--color-acid)]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-2 space-y-0.5">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-white/[0.06] text-[color:var(--color-ink)]"
                  : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-white/[0.04]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && item.label}
            </Link>
          );
        })}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[color:var(--color-faint)] hover:text-[color:var(--color-ink)] hover:bg-white/[0.04] transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}

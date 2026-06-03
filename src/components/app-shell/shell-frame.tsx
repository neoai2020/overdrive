"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { CommandPalette } from "@/components/command-palette";
import { CampaignBuilderWizard } from "@/components/wizards/campaign-builder-wizard";
import { GenerateWizard } from "@/components/wizards/generate-wizard";

const COLLAPSE_KEY = "od.sidebar.collapsed";

export function ShellFrame({
  user,
  children,
}: {
  user: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [campaignOpen, setCampaignOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);

  React.useEffect(() => {
    const v = localStorage.getItem(COLLAPSE_KEY);
    if (v === "1") setCollapsed(true);
  }, []);

  // Global keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      );
      const isMeta = e.metaKey || e.ctrlKey;

      // ⌘K → palette
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      // ⌘C / ⌘G as palette shortcuts (only when palette is closed AND not typing)
      if (isMeta && !isTyping && !paletteOpen) {
        if (e.key.toLowerCase() === "c") { e.preventDefault(); setCampaignOpen(true); return; }
        if (e.key.toLowerCase() === "g") { e.preventDefault(); setGenerateOpen(true); return; }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  const onCollapse = (c: boolean) => {
    setCollapsed(c);
    localStorage.setItem(COLLAPSE_KEY, c ? "1" : "0");
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onCollapsedChange={onCollapse} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          onLaunchCampaignBuilder={() => setCampaignOpen(true)}
          onLaunchGenerateAds={() => setGenerateOpen(true)}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onLaunchCampaignBuilder={() => setCampaignOpen(true)}
        onLaunchGenerateAds={() => setGenerateOpen(true)}
      />
      <CampaignBuilderWizard open={campaignOpen} onOpenChange={setCampaignOpen} />
      <GenerateWizard open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}

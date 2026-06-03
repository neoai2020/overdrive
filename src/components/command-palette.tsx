"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Search, Compass, Megaphone, Layers, Boxes, Mic2, FlaskConical, BookOpen,
  FileText, Plug, Settings, LayoutGrid, Plus, Sparkles, LogOut, ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLaunchCampaignBuilder: () => void;
  onLaunchGenerateAds: () => void;
}

interface SearchHit {
  kind: "offer" | "campaign" | "ad" | "batch" | "template";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export function CommandPalette({ open, onOpenChange, onLaunchCampaignBuilder, onLaunchGenerateAds }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const debouncedSearch = useDebounce(search, 180);

  const hitsQ = useQuery({
    queryKey: ["palette", debouncedSearch],
    queryFn: async (): Promise<SearchHit[]> => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const supabase = createClient();
      const pattern = `%${debouncedSearch}%`;

      // Run all 5 lookups in parallel
      const [offers, campaigns, ads, batches, templates] = await Promise.all([
        supabase.from("offers").select("id, name, niche").ilike("name", pattern).limit(5),
        supabase.from("campaigns").select("id, name, status").ilike("name", pattern).limit(5),
        supabase.from("ads").select("id, name, status, ad_versions!ads_current_version_fk(hook)").ilike("name", pattern).limit(5),
        supabase.from("batches").select("id, angle, custom_angle, status").or(`angle.ilike.${pattern},custom_angle.ilike.${pattern}`).limit(5),
        supabase.from("templates").select("id, name, kind").ilike("name", pattern).limit(5),
      ]);

      const hits: SearchHit[] = [];
      for (const o of (offers.data as Array<{ id: string; name: string; niche: string | null }> | null) ?? []) {
        hits.push({ kind: "offer", id: o.id, label: o.name, sublabel: o.niche ?? undefined, href: `/app/research/${o.id}` });
      }
      for (const c of (campaigns.data as Array<{ id: string; name: string; status: string }> | null) ?? []) {
        hits.push({ kind: "campaign", id: c.id, label: c.name, sublabel: c.status, href: `/app/campaigns/${c.id}` });
      }
      type AdRow = { id: string; name: string | null; status: string; ad_versions: { hook: string | null } | { hook: string | null }[] | null };
      for (const a of (ads.data as AdRow[] | null) ?? []) {
        const v = Array.isArray(a.ad_versions) ? a.ad_versions[0] : a.ad_versions;
        hits.push({ kind: "ad", id: a.id, label: v?.hook ?? a.name ?? "Ad", sublabel: a.status, href: `/app/ads/${a.id}` });
      }
      for (const b of (batches.data as Array<{ id: string; angle: string | null; custom_angle: string | null; status: string }> | null) ?? []) {
        hits.push({ kind: "batch", id: b.id, label: b.custom_angle ?? b.angle ?? "Batch", sublabel: b.status, href: `/app/batches/${b.id}` });
      }
      for (const t of (templates.data as Array<{ id: string; name: string; kind: string | null }> | null) ?? []) {
        hits.push({ kind: "template", id: t.id, label: t.name, sublabel: t.kind ?? undefined, href: `/app/templates` });
      }
      return hits;
    },
    enabled: debouncedSearch.length >= 2,
  });

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className="fixed inset-0 z-50"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 rounded-lg border border-white/10 bg-[color:var(--color-card2)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-white/8">
          <Search className="w-4 h-4 text-[color:var(--color-faint)] shrink-0" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search or run a command…"
            className="h-12 bg-transparent text-sm outline-none flex-1 placeholder:text-[color:var(--color-faint)]"
          />
          <kbd className="text-[10px] font-mono text-[color:var(--color-faint)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <Command.List className="max-h-[480px] overflow-y-auto py-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-[color:var(--color-muted)]">
            {search.length < 2 ? "Type to search offers, campaigns, ads, batches, or templates." : "No results."}
          </Command.Empty>

          {/* Quick actions — always visible */}
          {!debouncedSearch && (
            <>
              <Command.Group heading="Quick actions">
                <PaletteItem icon={Plus} label="New campaign" onSelect={() => { onOpenChange(false); onLaunchCampaignBuilder(); }} shortcut="C" />
                <PaletteItem icon={Sparkles} label="Generate ads" onSelect={() => { onOpenChange(false); onLaunchGenerateAds(); }} shortcut="G" />
                <PaletteItem icon={Compass} label="Research an offer" onSelect={() => go("/app/research")} />
              </Command.Group>
              <Command.Group heading="Jump to">
                <PaletteItem icon={LayoutGrid} label="Home" onSelect={() => go("/app")} />
                <PaletteItem icon={Megaphone} label="Campaigns" onSelect={() => go("/app/campaigns")} />
                <PaletteItem icon={Layers} label="Ads" onSelect={() => go("/app/ads")} />
                <PaletteItem icon={Boxes} label="Batches" onSelect={() => go("/app/batches")} />
                <PaletteItem icon={Compass} label="Research" onSelect={() => go("/app/research")} />
                <PaletteItem icon={FileText} label="Templates" onSelect={() => go("/app/templates")} />
                <PaletteItem icon={Mic2} label="Knowledge" onSelect={() => go("/app/voice")} />
                <PaletteItem icon={FlaskConical} label="Lab" onSelect={() => go("/app/lab")} />
                <PaletteItem icon={BookOpen} label="Learn" onSelect={() => go("/app/learn")} />
                <PaletteItem icon={Plug} label="Integrations" onSelect={() => go("/app/integrations")} />
                <PaletteItem icon={Settings} label="Settings" onSelect={() => go("/app/settings")} />
              </Command.Group>
              <Command.Group heading="Account">
                <PaletteItem
                  icon={LogOut}
                  label="Sign out"
                  onSelect={async () => {
                    await fetch("/auth/signout", { method: "POST" });
                    window.location.href = "/auth/login";
                  }}
                />
              </Command.Group>
            </>
          )}

          {/* Search hits */}
          {hitsQ.data && hitsQ.data.length > 0 && (
            <Command.Group heading="Results">
              {hitsQ.data.map((h) => {
                const KindIcon = kindIcon(h.kind);
                return (
                  <PaletteItem
                    key={`${h.kind}-${h.id}`}
                    icon={KindIcon}
                    label={h.label}
                    sublabel={`${h.kind}${h.sublabel ? ` · ${h.sublabel}` : ""}`}
                    onSelect={() => go(h.href)}
                  />
                );
              })}
            </Command.Group>
          )}
          {hitsQ.isLoading && debouncedSearch.length >= 2 && (
            <div className="px-4 py-3 text-xs text-[color:var(--color-faint)]">Searching…</div>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function PaletteItem({
  icon: Icon, label, sublabel, onSelect, shortcut,
}: {
  icon: typeof Search; label: string; sublabel?: string; onSelect: () => void; shortcut?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "px-3 mx-2 my-0.5 rounded-md flex items-center gap-3 cursor-pointer",
        "data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-[color:var(--color-ink)]",
        "text-[color:var(--color-muted)] text-sm"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate py-2">{label}</span>
      {sublabel && <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">{sublabel}</span>}
      {shortcut && <kbd className="text-[10px] font-mono text-[color:var(--color-faint)] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘{shortcut}</kbd>}
      <ArrowRight className="w-3 h-3 text-[color:var(--color-faint)] opacity-0 data-[selected=true]:opacity-60" />
    </Command.Item>
  );
}

function kindIcon(kind: SearchHit["kind"]) {
  return { offer: Compass, campaign: Megaphone, ad: Layers, batch: Boxes, template: FileText }[kind];
}

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

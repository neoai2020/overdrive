"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AdCard } from "@/components/ad-card";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";
import { OptionList } from "@/components/ui/option-list";
import { pushToMeta } from "@/lib/services";
import { cn } from "@/lib/utils";
import { Copy, Send, ArchiveX, X, CheckSquare } from "lucide-react";
import type { Ad, AdVersion } from "@/lib/types/database";

type AdRow = Ad & { current_version: AdVersion | null };

interface AdsGridProps {
  ads: AdRow[];
}

export function AdsGrid({ ads }: AdsGridProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const [focusIdx, setFocusIdx] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const lastSelectedIdxRef = React.useRef<number | null>(null);
  const [pushOpen, setPushOpen] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Reset focus when ads list changes
  React.useEffect(() => {
    if (focusIdx >= ads.length) setFocusIdx(Math.max(0, ads.length - 1));
  }, [ads.length, focusIdx]);

  // j/k/x/enter/esc keyboard nav
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const ad = ads[focusIdx];
      switch (e.key.toLowerCase()) {
        case "j": e.preventDefault(); setFocusIdx((i) => Math.min(ads.length - 1, i + 1)); break;
        case "k": e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); break;
        case "h": e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); break;
        case "l": e.preventDefault(); setFocusIdx((i) => Math.min(ads.length - 1, i + 1)); break;
        case "x":
          if (ad) {
            e.preventDefault();
            setSelected((prev) => {
              const next = new Set(prev);
              next.has(ad.id) ? next.delete(ad.id) : next.add(ad.id);
              return next;
            });
            lastSelectedIdxRef.current = focusIdx;
          }
          break;
        case "enter":
          if (ad) { e.preventDefault(); router.push(`/app/ads/${ad.id}`); }
          break;
        case "escape":
          if (selected.size > 0) { e.preventDefault(); setSelected(new Set()); }
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ads, focusIdx, router, selected.size]);

  // Scroll focused card into view
  React.useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current.querySelector<HTMLElement>(`[data-idx="${focusIdx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIdx]);

  function onCardSelect(idx: number, shift: boolean) {
    const ad = ads[idx];
    if (!ad) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && lastSelectedIdxRef.current !== null) {
        const [a, b] = [lastSelectedIdxRef.current, idx].sort((x, y) => x - y);
        for (let i = a; i <= b; i++) ads[i] && next.add(ads[i].id);
      } else {
        next.has(ad.id) ? next.delete(ad.id) : next.add(ad.id);
        lastSelectedIdxRef.current = idx;
      }
      return next;
    });
    setFocusIdx(idx);
  }

  // ─── Bulk actions ─────────────────────────────────────────────────────────
  const duplicateMut = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const ids = Array.from(selected);
      const { data: profile } = await supabase.from("profiles").select("workspace_id").maybeSingle();
      const workspace_id = (profile as { workspace_id?: string } | null)?.workspace_id;
      if (!workspace_id) throw new Error("No workspace");

      // Fetch source ads + their versions
      const { data: sources } = await supabase
        .from("ads")
        .select("id, offer_id, name, current_version:ad_versions!ads_current_version_fk(*)")
        .in("id", ids);
      type SourceRow = Pick<Ad, "id" | "offer_id" | "name"> & { current_version: AdVersion | null };
      const sourceRows = (sources ?? []) as unknown as SourceRow[];

      // Insert copies
      const newAdRows = sourceRows.map((s) => ({
        workspace_id, offer_id: s.offer_id, name: `${s.name ?? "Ad"} (copy)`, status: "ready" as const,
      }));
      const { data: created } = await supabase.from("ads").insert(newAdRows).select("id");
      const createdIds = ((created ?? []) as Array<{ id: string }>).map((r) => r.id);

      // Insert their versions (1 per copy, mirroring the source's current version)
      const versionRows = createdIds.map((newId, i) => {
        const v = sourceRows[i]?.current_version;
        return v ? {
          ad_id: newId, version_number: 1, hook: v.hook, script: v.script, style: v.style,
          length_seconds: v.length_seconds, voice_id: v.voice_id, talent_id: v.talent_id,
          thumbnail_url: v.thumbnail_url,
        } : null;
      }).filter(Boolean);
      if (versionRows.length > 0) await supabase.from("ad_versions").insert(versionRows as Array<Record<string, unknown>>);

      return createdIds.length;
    },
    onSuccess: (n) => { toast.success(`Duplicated ${n} ads`); setSelected(new Set()); router.refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const archiveMut = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("ads").update({ status: "archived" }).in("id", Array.from(selected));
      if (error) throw error;
      return selected.size;
    },
    onSuccess: (n) => { toast.success(`Archived ${n} ads`); setSelected(new Set()); router.refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-4 relative">
      <div
        ref={gridRef}
        className="grid gap-[13px] grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      >
        {ads.map((ad, idx) => (
          <div
            key={ad.id}
            data-idx={idx}
            onClick={(e) => {
              if (e.shiftKey || selected.size > 0) {
                e.preventDefault();
                onCardSelect(idx, e.shiftKey);
              } else {
                setFocusIdx(idx);
                router.push(`/app/ads/${ad.id}`);
              }
            }}
            className={cn(
              "relative rounded-lg transition-all",
              focusIdx === idx && "ring-2 ring-[color:var(--color-acid)]/60 ring-offset-2 ring-offset-[color:var(--color-bg)]"
            )}
          >
            <AdCard
              ad={ad}
              selected={selected.has(ad.id)}
              onSelect={() => onCardSelect(idx, false)}
            />
          </div>
        ))}
      </div>

      <BulkToolbar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onPush={() => setPushOpen(true)}
        onDuplicate={() => duplicateMut.mutate()}
        onArchive={() => archiveMut.mutate()}
        working={duplicateMut.isPending || archiveMut.isPending}
      />

      <BulkPushModal
        open={pushOpen}
        onOpenChange={setPushOpen}
        adIds={Array.from(selected)}
        onPushed={() => { setSelected(new Set()); router.refresh(); }}
      />
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function BulkToolbar({
  count, onClear, onPush, onDuplicate, onArchive, working,
}: {
  count: number; onClear: () => void; onPush: () => void; onDuplicate: () => void; onArchive: () => void; working: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-200",
        count > 0 ? "bottom-6 opacity-100" : "bottom-2 opacity-0 pointer-events-none translate-y-2"
      )}
    >
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[color:var(--color-card2)]/95 backdrop-blur shadow-2xl px-3 py-2">
        <div className="flex items-center gap-2 pr-2 border-r border-white/8">
          <CheckSquare className="w-4 h-4 text-[color:var(--color-acid)]" />
          <span className="text-sm font-mono">{count}</span>
          <span className="text-xs text-[color:var(--color-muted)]">selected</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onPush} disabled={working}>
          <Send className="w-3.5 h-3.5" /> Push to set
        </Button>
        <Button size="sm" variant="secondary" onClick={onDuplicate} disabled={working}>
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </Button>
        <Button size="sm" variant="ghost" onClick={onArchive} disabled={working}>
          <ArchiveX className="w-3.5 h-3.5" /> Archive
        </Button>
        <button onClick={onClear} className="ml-1 p-1 rounded hover:bg-white/5" aria-label="Clear selection">
          <X className="w-4 h-4 text-[color:var(--color-faint)]" />
        </button>
      </div>
    </div>
  );
}

// ─── Bulk push modal ─────────────────────────────────────────────────────────
function BulkPushModal({
  open, onOpenChange, adIds, onPushed,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; adIds: string[]; onPushed: () => void;
}) {
  const adSetsQ = useQuery({
    queryKey: ["ad_sets", "all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ad_sets")
        .select("id, name, campaign:campaigns(name)")
        .order("created_at", { ascending: false });
      return (data ?? []) as Array<{ id: string; name: string; campaign: { name: string } | { name: string }[] | null }>;
    },
    enabled: open,
  });

  const [picked, setPicked] = React.useState<string>("");

  const pushMut = useMutation({
    mutationFn: async () => { await pushToMeta(adIds, picked); },
    onSuccess: () => { toast.success(`Pushed ${adIds.length} ad${adIds.length === 1 ? "" : "s"}`); onPushed(); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Push failed"),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader><ModalTitle>Push {adIds.length} ad{adIds.length === 1 ? "" : "s"} to ad set</ModalTitle></ModalHeader>
        <ModalBody>
          {adSetsQ.data && adSetsQ.data.length > 0 ? (
            <OptionList
              value={picked}
              onChange={setPicked}
              options={adSetsQ.data.map((s) => {
                const c = Array.isArray(s.campaign) ? s.campaign[0] : s.campaign;
                return { value: s.id, label: s.name, description: c?.name };
              })}
            />
          ) : (
            <p className="text-sm text-[color:var(--color-muted)]">No ad sets yet. Create a campaign first.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <span className="text-xs text-[color:var(--color-muted)]">Stages each ad in the set as a placement. Duplicates are upserted.</span>
          <Button onClick={() => pushMut.mutate()} disabled={!picked || pushMut.isPending}>
            <Send className="w-4 h-4" /> Push {adIds.length}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

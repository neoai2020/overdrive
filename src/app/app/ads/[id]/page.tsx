"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Textarea, Label } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Chip } from "@/components/ui/chip";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";
import { OptionList } from "@/components/ui/option-list";
import { useRealtimeRow, useRealtimeTable } from "@/lib/hooks/use-realtime";
import { pushToMeta } from "@/lib/services";
import { Play, Send, Copy, RefreshCw, ArchiveX, History } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Ad, AdVersion, AdSet } from "@/lib/types/database";

export default function AdDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  useRealtimeRow("ads", id, ["ads", id]);
  useRealtimeTable("ad_versions", ["ad_versions", "by-ad", id], `ad_id=eq.${id}`);

  const adQ = useQuery({
    queryKey: ["ads", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ads")
        .select("*, current_version:ad_versions!ads_current_version_fk(*), offer:offers(id, name, niche)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Ad & {
        current_version: AdVersion | null;
        offer: { id: string; name: string; niche: string | null } | null;
      };
    },
  });

  const versionsQ = useQuery({
    queryKey: ["ad_versions", "by-ad", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ad_versions")
        .select("*")
        .eq("ad_id", id)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdVersion[];
    },
  });

  const placementsQ = useQuery({
    queryKey: ["ad_placements", "by-ad", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ad_placements")
        .select("*, ad_set:ad_sets(id, name, campaign_id), campaign:ad_sets(campaign_id)")
        .eq("ad_id", id);
      return (data ?? []) as Array<{
        id: string;
        status: string;
        ad_set: { id: string; name: string; campaign_id: string } | null;
      }>;
    },
  });

  const updateScriptMut = useMutation({
    mutationFn: async ({ versionId, hook, script }: { versionId: string; hook: string; script: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("ad_versions").update({ hook, script }).eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Script saved"); qc.invalidateQueries({ queryKey: ["ads", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const duplicateMut = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const ad = adQ.data!;
      const v = ad.current_version;
      const { data: profile } = await supabase.from("profiles").select("workspace_id").maybeSingle();
      const workspace_id = (profile as { workspace_id?: string } | null)?.workspace_id;
      if (!workspace_id) throw new Error("No workspace");
      const { data: newAd, error } = await supabase
        .from("ads")
        .insert({ workspace_id, offer_id: ad.offer_id, name: `${ad.name ?? "Ad"} (copy)`, status: "ready" })
        .select("id")
        .single();
      if (error) throw error;
      if (v) {
        await supabase.from("ad_versions").insert({
          ad_id: (newAd as { id: string }).id,
          version_number: 1,
          hook: v.hook, script: v.script, style: v.style, length_seconds: v.length_seconds,
          voice_id: v.voice_id, talent_id: v.talent_id, thumbnail_url: v.thumbnail_url,
        });
      }
      return (newAd as { id: string }).id;
    },
    onSuccess: (newId) => { toast.success("Ad duplicated"); window.location.href = `/app/ads/${newId}`; },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const archiveMut = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("ads").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ad archived"); qc.invalidateQueries({ queryKey: ["ads", id] }); },
  });

  const [editing, setEditing] = React.useState(false);
  const [hook, setHook] = React.useState("");
  const [script, setScript] = React.useState("");
  const [pushOpen, setPushOpen] = React.useState(false);

  React.useEffect(() => {
    if (adQ.data?.current_version) {
      setHook(adQ.data.current_version.hook ?? "");
      setScript(adQ.data.current_version.script ?? "");
    }
  }, [adQ.data?.current_version?.id]);

  if (adQ.isLoading) return <div className="p-8 text-sm text-[color:var(--color-muted)]">Loading…</div>;
  if (adQ.isError || !adQ.data) return notFound();

  const ad = adQ.data;
  const v = ad.current_version;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <Link href="/app/ads" className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">← All ads</Link>

      <PageHeader
        eyebrow={ad.offer ? `${ad.offer.name}${ad.offer.niche ? ` · ${ad.offer.niche.replace(/_/g, " ")}` : ""}` : "Ad"}
        title={v?.hook ?? ad.name ?? "Untitled ad"}
        description={v?.style ? `${v.style.replace(/_/g, " ")} · ${v.length_seconds ?? "?"}s · v${v.version_number} · created ${formatRelativeTime(ad.created_at)}` : undefined}
        actions={
          <>
            <StatusPill status={ad.status} />
            <Button variant="secondary" onClick={() => duplicateMut.mutate()} disabled={duplicateMut.isPending}>
              <Copy className="w-4 h-4" /> Duplicate
            </Button>
            <Button variant="secondary" onClick={() => toast.info("Regeneration ships in Phase 2 (calls service worker).")}>
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
            <Button onClick={() => setPushOpen(true)}>
              <Send className="w-4 h-4" /> Push to ad set
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Player */}
        <div className="space-y-4">
          <div className="aspect-[9/16] bg-black rounded-lg border border-white/8 overflow-hidden relative group">
            {v?.video_url ? (
              <video src={v.video_url} controls className="w-full h-full object-cover" poster={v.thumbnail_url ?? undefined} />
            ) : v?.thumbnail_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnail_url} alt={v.hook ?? "ad"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                  <Play className="w-7 h-7 ml-1 fill-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[color:var(--color-faint)]">
                <Play className="w-10 h-10" strokeWidth={1.25} />
                <span className="text-xs uppercase tracking-wider">No render yet</span>
              </div>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle>Where this ad runs</CardTitle></CardHeader>
            <CardContent>
              {placementsQ.data && placementsQ.data.length > 0 ? (
                <ul className="space-y-2">
                  {placementsQ.data.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      {p.ad_set ? (
                        <Link
                          href={`/app/campaigns/${p.ad_set.campaign_id}/ad-sets/${p.ad_set.id}`}
                          className="text-[color:var(--color-ink)] hover:text-[color:var(--color-acid)] truncate"
                        >
                          {p.ad_set.name}
                        </Link>
                      ) : <span className="text-[color:var(--color-faint)]">—</span>}
                      <StatusPill status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[color:var(--color-muted)]">Not placed in any ad set yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Script</CardTitle>
                <CardDescription>Hook, beats and CTA. Edit inline.</CardDescription>
              </div>
              {!editing ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setHook(v?.hook ?? ""); setScript(v?.script ?? ""); setEditing(false);
                  }}>Cancel</Button>
                  <Button size="sm" onClick={() => {
                    if (v) updateScriptMut.mutate({ versionId: v.id, hook, script });
                    setEditing(false);
                  }} disabled={updateScriptMut.isPending}>Save</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hook</Label>
                {editing ? (
                  <Textarea rows={2} value={hook} onChange={(e) => setHook(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium leading-relaxed">{v?.hook || <span className="text-[color:var(--color-faint)]">No hook</span>}</p>
                )}
              </div>
              <div>
                <Label>Script</Label>
                {editing ? (
                  <Textarea rows={12} value={script} onChange={(e) => setScript(e.target.value)} className="font-mono text-xs" />
                ) : (
                  <pre className="text-sm text-[color:var(--color-muted)] whitespace-pre-wrap font-mono leading-relaxed bg-white/[0.02] border border-white/5 rounded-md p-3">
                    {v?.script || <span className="text-[color:var(--color-faint)]">No script</span>}
                  </pre>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                {v?.style && <Chip>{v.style.replace(/_/g, " ")}</Chip>}
                {v?.voice_id && <Chip>voice · {v.voice_id}</Chip>}
                {v?.talent_id && <Chip>talent · {v.talent_id}</Chip>}
                {v?.length_seconds && <Chip>{v.length_seconds}s</Chip>}
              </div>
            </CardContent>
          </Card>

          {versionsQ.data && versionsQ.data.length > 1 && (
            <Card>
              <CardHeader><CardTitle><History className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Version history</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-white/5 -mx-5">
                  {versionsQ.data.map((ver) => (
                    <li key={ver.id} className="px-5 py-3 flex items-center gap-3">
                      <span className="font-mono text-[10px] text-[color:var(--color-faint)] w-8">v{ver.version_number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{ver.hook ?? "—"}</div>
                        <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider mt-0.5">
                          {ver.style?.replace(/_/g, " ")} · {formatRelativeTime(ver.created_at)}
                        </div>
                      </div>
                      {ver.id === v?.id && <Chip variant="acid">current</Chip>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {ad.status !== "archived" && (
            <button onClick={() => archiveMut.mutate()} className="text-xs text-[color:var(--color-faint)] hover:text-[color:var(--color-hot)] inline-flex items-center gap-1.5">
              <ArchiveX className="w-3.5 h-3.5" /> Archive this ad
            </button>
          )}
        </div>
      </div>

      <PushToAdSetModal open={pushOpen} onOpenChange={setPushOpen} adId={id} />
    </div>
  );
}

// ─── Push-to-ad-set modal ────────────────────────────────────────────────────
function PushToAdSetModal({ open, onOpenChange, adId }: { open: boolean; onOpenChange: (o: boolean) => void; adId: string }) {
  const qc = useQueryClient();
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
    mutationFn: async () => { await pushToMeta([adId], picked); },
    onSuccess: () => {
      toast.success("Pushed to ad set");
      qc.invalidateQueries({ queryKey: ["ad_placements", "by-ad", adId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Push failed"),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader><ModalTitle>Push to ad set</ModalTitle></ModalHeader>
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
          <span className="text-xs text-[color:var(--color-muted)]">Stages this ad in the selected set and pushes via the Meta integration.</span>
          <Button onClick={() => pushMut.mutate()} disabled={!picked || pushMut.isPending}>
            <Send className="w-4 h-4" /> Push
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

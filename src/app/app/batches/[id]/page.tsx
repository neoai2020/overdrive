"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdCard } from "@/components/ad-card";
import { useRealtimeRow } from "@/lib/hooks/use-realtime";
import { Boxes, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Ad, AdVersion, Batch } from "@/lib/types/database";

const STEP_LABELS: Record<string, string> = {
  queued: "Queued",
  reading: "Understanding the offer",
  hooks: "Generating hooks",
  awaiting_hooks_approval: "Waiting for hook approval",
  scripting: "Writing scripts",
  voicing: "Recording voiceovers",
  shooting: "Rendering shots",
  assembling: "Assembling final video",
  done: "Done",
};

export default function BatchDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  useRealtimeRow("batches", id, ["batches", id]);
  useRealtimeRow("ads", undefined, ["ads", "by-batch", id]); // covered by table-level below
  useRealtimeRow("ad_versions", undefined, ["ad_versions", "by-batch", id]);

  const batchQ = useQuery({
    queryKey: ["batches", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("batches").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Batch;
    },
    refetchInterval: 3_000,
  });

  const adsQ = useQuery({
    queryKey: ["ads", "by-batch", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ads")
        .select("*, current_version:ad_versions!ads_current_version_fk(*)")
        .eq("batch_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<Ad & { current_version: AdVersion | null }>;
    },
    refetchInterval: 5_000,
  });

  if (batchQ.isLoading) return <div className="p-8 text-sm text-[color:var(--color-muted)]">Loading…</div>;
  if (batchQ.isError || !batchQ.data) return notFound();

  const batch = batchQ.data;
  const isRunning = batch.status === "queued" || batch.status === "generating";
  const pendingHooks = (batch.metadata as { pending_review_hooks?: { text: string; style?: string }[] } | null)?.pending_review_hooks;
  const needsHookReview = batch.status === "needs_review" && pendingHooks && pendingHooks.length > 0;

  const costSpent = Number((batch as unknown as { cost_spent?: number }).cost_spent ?? 0);
  const costCap = Number((batch as unknown as { cost_cap?: number }).cost_cap ?? 0);

  async function approveHooks() {
    const r = await fetch(`/api/batches/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "hooks" }),
    });
    if (!r.ok) alert("Failed to approve");
    else batchQ.refetch();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <Link href="/app/batches" className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">← All batches</Link>

      <PageHeader
        eyebrow={`Batch · ${batch.style_mix.map((s) => s.replace(/_/g, " ")).join(" · ")}`}
        title={batch.custom_angle ?? batch.angle ?? "Untitled batch"}
        description={`Started ${formatRelativeTime(batch.created_at)} · ${batch.size} ads · ${batch.run_mode.replace(/_/g, " ")}`}
        actions={<StatusPill status={batch.status} />}
      />

      {/* Progress */}
      {isRunning && (
        <div className="rounded-lg border border-[color:var(--color-amber)]/30 bg-[color:var(--color-amber)]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-amber)]">
              <Loader2 className="w-4 h-4 animate-spin-acid" /> {STEP_LABELS[batch.progress_step ?? "queued"] ?? batch.progress_step}
            </div>
            <div className="text-xs font-mono text-[color:var(--color-amber)]">{batch.progress_pct ?? 0}%</div>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-[color:var(--color-amber)] transition-all duration-500" style={{ width: `${batch.progress_pct ?? 0}%` }} />
          </div>
        </div>
      )}

      {/* Review checkpoint */}
      {needsHookReview && (
        <div className="rounded-lg border border-[color:var(--color-acid)]/40 bg-[color:var(--color-acid)]/5 p-5">
          <div className="font-medium mb-3">Review hooks before scripting</div>
          <ol className="space-y-2 mb-4">
            {pendingHooks.map((h, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-xs font-mono text-[color:var(--color-muted)] mt-0.5 w-6">{i + 1}.</span>
                <span className="flex-1">{h.text}</span>
                {h.style && <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">{h.style}</span>}
              </li>
            ))}
          </ol>
          <button
            onClick={approveHooks}
            className="text-sm bg-[color:var(--color-acid)] text-black px-4 py-2 rounded-md font-semibold hover:bg-[color:var(--color-acid)]/90"
          >
            Approve hooks &amp; continue
          </button>
        </div>
      )}

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Status" value={batch.status.replace(/_/g, " ")} accent={batch.status === "ready" ? "green" : "amber"} />
        <StatCard label="Ads created" value={adsQ.data?.length ?? 0} accent="blue" />
        <StatCard label="Cost" value={`$${costSpent.toFixed(2)}${costCap > 0 ? ` / $${costCap.toFixed(2)}` : ""}`} accent="acid" />
        <StatCard label="Mode" value={batch.run_mode.replace(/_/g, " ")} />
      </section>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">Output</h2>
        {!adsQ.data?.length ? (
          <EmptyState
            icon={Boxes}
            title={isRunning ? "Generating…" : "No ads yet"}
            description={isRunning ? "Ads will appear here as each renders." : "This batch didn't produce any ads."}
          />
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {adsQ.data.map((a) => <AdCard key={a.id} ad={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}

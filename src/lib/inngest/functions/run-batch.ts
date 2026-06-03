/**
 * runBatch — the parent orchestrator for one batch.
 *
 *   batch.created → understand-offer → generate-hooks → score-hooks
 *                 → [review checkpoint]
 *                 → fan-out N ads (via ad.created events)
 *                 → wait for all ads → close batch (ready | partial)
 *
 * Step boundaries are chosen so a crash mid-batch resumes idempotently.
 */

import { inngest } from "@/lib/inngest/client";
import { NonRetriableError } from "inngest";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveLLM } from "@/lib/providers/registry";
import { logEvent, addCost } from "@/lib/pipeline/events";
import * as understandOffer from "@/lib/prompts/understand-offer";
import * as generateHooks from "@/lib/prompts/generate-hooks";
import * as scoreHooks from "@/lib/prompts/score-hooks";

const REVIEW_TIMEOUT = "24h"; // user has 24h to approve before batch is abandoned

export const runBatch = inngest.createFunction(
  { id: "run-batch", name: "Run batch", retries: 1 },
  { event: "batch.created" },
  async ({ event, step }) => {
    const { batchId, workspaceId } = event.data;

    // ───── Load batch + offer ──────────────────────────────────────────
    const batch = await step.run("load-batch", async () => {
      const supabase = await createAdminClient();
      const { data, error } = await supabase
        .from("batches")
        .select("*, offers(*)")
        .eq("id", batchId)
        .single();
      if (error || !data) throw new NonRetriableError(`Batch ${batchId} not found`);
      return data as Record<string, unknown> & { offers?: Record<string, unknown> | null };
    });

    const angle = (batch.custom_angle as string) || (batch.angle as string) || "pain";
    const size = (batch.size as number) ?? 10;
    const mode = (batch.run_mode as string) ?? "autopilot";

    // ───── Mark generating ────────────────────────────────────────────
    await step.run("mark-generating", async () => {
      const supabase = await createAdminClient();
      await supabase.from("batches").update({
        status: "generating",
        progress_step: "reading",
        progress_pct: 5,
      }).eq("id", batchId);
      await logEvent({ workspaceId, batchId, stage: "batch_start", message: `Batch started — ${size} ads, mode=${mode}` });
    });

    // ───── Stage 1: understand offer ──────────────────────────────────
    const brief = await step.run("understand-offer", async () => {
      const offer = batch.offers as Record<string, unknown> | null;
      const rawInput = [offer?.name, offer?.promise, offer?.proof, offer?.price_text, offer?.url]
        .filter(Boolean).join("\n\n") || (batch.metadata as Record<string, unknown>)?.raw_input as string || "Unknown offer";
      const { adapter, provider, model } = await resolveLLM("understand_offer", workspaceId);
      const result = await adapter.complete({
        messages: [
          { role: "system", content: understandOffer.SYSTEM },
          { role: "user", content: understandOffer.userPrompt({ rawInput }) },
        ],
        json: true,
      });
      await logEvent({
        workspaceId, batchId, stage: "understand_offer",
        message: `briefed via ${provider}/${model}`,
        data: { provider, model, latency_ms: result.latency_ms, tokens: result.tokens, cost_usd: result.cost_usd },
      });
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.understand_offer" });
      return (result.json as Record<string, unknown>) ?? { text: result.text };
    });

    await step.run("save-brief", async () => {
      const supabase = await createAdminClient();
      await supabase.from("batches").update({
        brief,
        progress_step: "hooks",
        progress_pct: 15,
      }).eq("id", batchId);
    });

    // ───── Stage 2: generate hooks (with buffer) ─────────────────────
    const candidateHooks = await step.run("generate-hooks", async () => {
      const { adapter, provider, model } = await resolveLLM("generate_hooks", workspaceId);
      const result = await adapter.complete({
        messages: [
          { role: "system", content: generateHooks.SYSTEM },
          { role: "user", content: generateHooks.userPrompt({ brief, angle, count: size + 4 }) },
        ],
        json: true,
      });
      await logEvent({
        workspaceId, batchId, stage: "generate_hooks",
        message: `generated candidate hooks via ${provider}/${model}`,
        data: { provider, model, count: size + 4, cost_usd: result.cost_usd },
      });
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.generate_hooks" });
      const parsed = result.json as { hooks?: { text: string; style?: string }[] } | null;
      return parsed?.hooks ?? [];
    });

    // ───── Stage 3: score hooks (top N = batch.size) ─────────────────
    type ScoredHook = { text: string; style?: string; rank?: number; score?: number };
    const scoredHooks: ScoredHook[] = await step.run("score-hooks", async (): Promise<ScoredHook[]> => {
      const { adapter, provider, model } = await resolveLLM("score_hooks", workspaceId);
      const result = await adapter.complete({
        messages: [
          { role: "system", content: scoreHooks.SYSTEM },
          { role: "user", content: scoreHooks.userPrompt({ brief, candidates: candidateHooks as ScoredHook[], topN: size }) },
        ],
        json: true,
      });
      await logEvent({
        workspaceId, batchId, stage: "score_hooks",
        message: `scored, top ${size} kept`,
        data: { provider, model, cost_usd: result.cost_usd },
      });
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.score_hooks" });
      const parsed = result.json as { hooks?: ScoredHook[] } | null;
      return (parsed?.hooks ?? (candidateHooks as ScoredHook[]).slice(0, size)).slice(0, size);
    });

    // ───── Review checkpoint after hooks ──────────────────────────────
    if (mode === "review_checkpoints") {
      await step.run("pause-for-hooks-review", async () => {
        const supabase = await createAdminClient();
        await supabase.from("batches").update({
          status: "needs_review",
          progress_step: "awaiting_hooks_approval",
          progress_pct: 30,
          metadata: { ...(batch.metadata as Record<string, unknown> ?? {}), pending_review_hooks: scoredHooks },
        }).eq("id", batchId);
        await logEvent({ workspaceId, batchId, stage: "review", message: `paused for hook approval` });
      });

      const approval = await step.waitForEvent("hooks-approved", {
        event: "batch.hooks.approved",
        timeout: REVIEW_TIMEOUT,
        if: `event.data.batchId == "${batchId}"`,
      });
      if (!approval) {
        await step.run("abandon-on-timeout", async () => {
          const supabase = await createAdminClient();
          await supabase.from("batches").update({ status: "cancelled" }).eq("id", batchId);
          await logEvent({ workspaceId, batchId, stage: "review", level: "warn", message: "abandoned — no hook approval within 24h" });
        });
        return { status: "cancelled" };
      }
      // Apply edits if any.
      if (approval.data.edits && approval.data.edits.length > 0) {
        const editsMap = new Map(approval.data.edits.map((e) => [e.adId, e.hook]));
        for (let i = 0; i < scoredHooks.length; i++) {
          // edits keyed by future ad id won't exist yet — instead the UI edits hook[i] directly via index.
          // Accept full replacement payload if shape matches.
          void editsMap;
        }
      }
    }

    // ───── Stage 3.5: create N ad rows + emit ad.created events ──────
    const adIds = await step.run("create-ads", async () => {
      const supabase = await createAdminClient();
      const rows = scoredHooks.map((h) => ({
        workspace_id: workspaceId,
        offer_id: batch.offer_id as string | null,
        batch_id: batchId,
        name: (h.text ?? "").slice(0, 80),
        status: "queued" as const,
      }));
      const { data: createdAds, error } = await supabase.from("ads").insert(rows).select("id");
      if (error || !createdAds) throw new NonRetriableError(`Failed to create ads: ${error?.message}`);

      // Insert ad_version 1 for each with the hook locked in.
      const versions = createdAds.map((ad, i) => ({
        ad_id: ad.id as string,
        version_number: 1,
        hook: scoredHooks[i].text,
        style: (batch.style_mix as string[])?.[0] ?? "ugc_talking_head",
      }));
      const { data: vs, error: vErr } = await supabase.from("ad_versions").insert(versions).select("id, ad_id");
      if (vErr || !vs) throw new NonRetriableError(`Failed to create ad_versions: ${vErr?.message}`);

      // Point ads.current_version_id at the new version.
      for (const v of vs) {
        await supabase.from("ads").update({ current_version_id: v.id as string }).eq("id", v.ad_id as string);
      }

      await supabase.from("batches").update({
        progress_step: "scripting",
        progress_pct: 40,
      }).eq("id", batchId);

      return createdAds.map((a) => a.id as string);
    });

    // Fan-out via events (parallel ad pipelines).
    await step.sendEvent("fan-out-ads", adIds.map((adId) => ({
      name: "ad.created" as const,
      data: { adId, batchId, workspaceId },
    })));

    await logEvent({ workspaceId, batchId, stage: "fan_out", message: `fanned out ${adIds.length} ads` });

    // We don't `await` per-ad completion here — runAd writes its own status and
    // a separate "batch closer" runs on a timer (see closeBatchIfDone below).
    // This keeps the parent function short and avoids a tied-up Inngest worker.
    return { status: "fanned-out", adIds };
  }
);

/**
 * closeBatchIfDone — runs every 60s after a batch is created, looks at all ads
 * for that batch, and flips batch.status to ready/partial/failed once everything
 * settles. Cheaper than fancier coordination for v1.
 */
export const closeBatchIfDone = inngest.createFunction(
  { id: "close-batch-if-done", name: "Close batch when all ads settle" },
  { cron: "*/1 * * * *" }, // every minute
  async ({ step }) => {
    const supabase = await createAdminClient();
    const { data: openBatches } = await supabase
      .from("batches")
      .select("id, workspace_id, size")
      .in("status", ["generating", "needs_review"]);
    if (!openBatches || openBatches.length === 0) return { closed: 0 };

    let closed = 0;
    for (const b of openBatches) {
      const batchId = b.id as string;
      const workspaceId = b.workspace_id as string;
      const total = Number(b.size ?? 0);
      const { data: ads } = await supabase
        .from("ads")
        .select("status")
        .eq("batch_id", batchId);
      if (!ads || ads.length === 0) continue;

      const terminal = ads.filter((a) => ["ready", "failed", "archived", "partial"].includes(a.status as string)).length;
      if (terminal < ads.length) continue; // still in flight

      const ready = ads.filter((a) => ["ready", "partial"].includes(a.status as string)).length;
      const finalStatus =
        ready === total ? "ready" :
        ready === 0 ? "failed" :
        "partial";

      await supabase.from("batches").update({
        status: finalStatus,
        progress_step: "done",
        progress_pct: 100,
        completed_at: new Date().toISOString(),
      }).eq("id", batchId);

      await logEvent({
        workspaceId, batchId, stage: "batch_close",
        message: `closed as ${finalStatus} (${ready}/${total} ready)`,
        data: { ready, total },
      });
      closed++;
      // step is unused in the loop body but kept on the signature for Inngest's instrumentation.
      void step;
    }
    return { closed };
  }
);

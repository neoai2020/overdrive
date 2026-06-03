/**
 * runShot — per-shot orchestrator. Handles the expensive bit:
 *   gen-still → submit-clip → (webhook event OR bounded poll loop)
 *
 * Retry policy:
 *   • submit-clip wrapped in a step.run, Inngest retries up to 3x on transient
 *     errors (controlled by ProviderError.retryable).
 *   • Per-shot attempts counter increments on each submit retry; if attempts
 *     exceed shots.max_attempts, the shot is marked `dead` rather than the
 *     whole ad failing.
 *   • If the provider supports webhooks, we use step.waitForEvent.
 *   • Otherwise we poll with backoff; each poll iteration is its own step.run
 *     so a worker crash doesn't restart polling.
 */

import { inngest } from "@/lib/inngest/client";
import { NonRetriableError } from "inngest";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveImage, resolveVideo } from "@/lib/providers/registry";
import { logEvent, addCost } from "@/lib/pipeline/events";
import { ProviderError } from "@/lib/providers/types";

const MAX_POLL_ITERATIONS = 20;
function backoffSeconds(i: number): number {
  return Math.min(240, 15 * Math.pow(1.7, i)); // 15s, 25s, 43s, 73s, ... capped at 4min
}

export const runShot = inngest.createFunction(
  { id: "run-shot", name: "Run shot pipeline", retries: 0, concurrency: { limit: 30 } },
  { event: "shot.created" },
  async ({ event, step }) => {
    const { shotId, adId, batchId, workspaceId } = event.data;

    // ───── Load shot + presenter + voiceover slice ────────────────────
    const ctx = await step.run("load-shot", async () => {
      const supabase = await createAdminClient();
      const { data: shot } = await supabase.from("shots").select("*").eq("id", shotId).single();
      if (!shot) throw new NonRetriableError(`Shot ${shotId} not found`);
      const { data: ad } = await supabase.from("ads").select("presenter_id").eq("id", shot.ad_id as string).single();
      const presenterId = ad?.presenter_id as string | null;
      const { data: presenter } = presenterId
        ? await supabase.from("presenters").select("*").eq("id", presenterId).single()
        : { data: null };
      const { data: vo } = await supabase
        .from("voiceovers")
        .select("audio_url")
        .eq("ad_version_id", shot.ad_version_id as string)
        .maybeSingle();
      return {
        shot,
        presenter: presenter as Record<string, unknown> | null,
        voiceAudioUrl: (vo?.audio_url as string) ?? null,
      };
    });

    const { shot, presenter, voiceAudioUrl } = ctx;
    const voText = (shot.vo_text as string) ?? "";
    const voStart = Number(shot.vo_start ?? 0);
    const voEnd = Number(shot.vo_end ?? 0);
    const durationSeconds = Math.max(2, Math.round(voEnd - voStart));

    // ───── Stage 8a: gen still (optional but improves consistency) ────
    const stillUrl = await step.run("gen-still", async () => {
      const supabase = await createAdminClient();
      await supabase.from("shots").update({ status: "generating", attempts: Number(shot.attempts ?? 0) + 1 }).eq("id", shotId);
      try {
        const { adapter, provider, model } = await resolveImage("image", workspaceId);
        const result = await adapter.generate({
          prompt: `${presenter?.persona ?? "a person"} talking to camera, UGC selfie style, 9:16 portrait. ${shot.on_screen ?? ""}`,
          referenceImageUrl: (presenter?.reference_image_url as string) ?? undefined,
          referenceCharacterId: (presenter?.reference_id as string) ?? undefined,
          aspectRatio: "9:16",
        });
        const url = result.imageUrl ?? null;
        if (url) {
          await supabase.from("shots").update({ still_url: url, provider, model }).eq("id", shotId);
        }
        await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.image", relatedTable: "shots", relatedId: shotId });
        await logEvent({ workspaceId, batchId, adId, shotId, stage: "gen_still", message: `still via ${provider}/${model}`, data: { cost_usd: result.cost_usd } });
        return url;
      } catch (e) {
        // Stills are best-effort — skipping is fine, video provider can still work with text only.
        const msg = e instanceof Error ? e.message : String(e);
        await logEvent({ workspaceId, batchId, adId, shotId, stage: "gen_still", level: "warn", message: `still skipped: ${msg}` });
        return null;
      }
    });

    // ───── Stage 8b: submit clip ──────────────────────────────────────
    type Submitted = { jobId: string; provider: string; model: string; supportsWebhook: boolean };
    const submitted: Submitted = await step.run("submit-clip", async () => {
      const supabase = await createAdminClient();
      const { adapter, provider, model } = await resolveVideo("video", workspaceId);
      const idempotencyKey = `${shotId}:${shot.attempts ?? 0}`;
      const webhookUrl = adapter.supportsWebhook
        ? `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")}/api/webhooks/video?provider=${provider}`
        : undefined;
      try {
        const sub = await adapter.submit({
          prompt: `${presenter?.persona ?? "a person"} speaking the line: "${voText}". UGC talking-head, 9:16.`,
          startImageUrl: stillUrl ?? (presenter?.reference_image_url as string) ?? undefined,
          referenceCharacterId: (presenter?.reference_id as string) ?? undefined,
          voiceAudioUrl: voiceAudioUrl ?? undefined,
          durationSeconds,
          aspectRatio: "9:16",
          idempotencyKey,
          webhookUrl,
        });
        await supabase.from("shots").update({
          provider: sub.provider,
          model: sub.model,
          provider_job_id: sub.jobId,
        }).eq("id", shotId);
        await logEvent({ workspaceId, batchId, adId, shotId, stage: "submit_clip", message: `submitted via ${sub.provider}/${sub.model}`, data: { job_id: sub.jobId } });
        return { ...sub, supportsWebhook: adapter.supportsWebhook };
      } catch (e) {
        if (e instanceof ProviderError && !e.retryable) {
          throw new NonRetriableError(e.message);
        }
        throw e;
      }
    });

    // ───── Stage 8c: await completion (webhook OR poll) ───────────────
    let videoUrl: string | null = null;
    let clipCost = 0;
    let clipDuration = durationSeconds;

    if (submitted.supportsWebhook) {
      const ev = await step.waitForEvent("video-done", {
        event: "shot.video.done",
        timeout: "15m",
        if: `event.data.shotId == "${shotId}"`,
      });
      if (ev) {
        videoUrl = ev.data.videoUrl;
        clipCost = ev.data.cost_usd;
        clipDuration = ev.data.durationSeconds;
      } else {
        // Webhook never arrived — fall back to polling once.
        const status = await step.run("poll-after-webhook-timeout", async () => {
          const { adapter } = await resolveVideo("video", workspaceId);
          return adapter.poll(submitted.jobId);
        });
        if (status.status === "done") {
          videoUrl = status.videoUrl;
          clipCost = status.cost_usd;
          clipDuration = status.durationSeconds;
        }
      }
    } else {
      for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
        const status = await step.run(`poll-${i}`, async () => {
          const { adapter } = await resolveVideo("video", workspaceId);
          return adapter.poll(submitted.jobId);
        });
        if (status.status === "done") {
          videoUrl = status.videoUrl;
          clipCost = status.cost_usd;
          clipDuration = status.durationSeconds;
          break;
        }
        if (status.status === "failed") {
          await logEvent({
            workspaceId, batchId, adId, shotId, stage: "video_failed", level: "warn",
            message: `provider failure: ${status.error}`,
            data: { retryable: status.retryable },
          });
          if (!status.retryable) break;
        }
        await step.sleep(`backoff-${i}`, `${backoffSeconds(i)}s`);
      }
    }

    // ───── Persist final result ──────────────────────────────────────
    await step.run("persist-shot", async () => {
      const supabase = await createAdminClient();
      if (videoUrl) {
        await supabase.from("shots").update({
          status: "done",
          video_url: videoUrl,
          cost: clipCost,
          metadata: { duration_seconds: clipDuration },
        }).eq("id", shotId);
        await addCost({ workspaceId, batchId, costUsd: clipCost, reason: "pipeline.video", relatedTable: "shots", relatedId: shotId });
        await logEvent({ workspaceId, batchId, adId, shotId, stage: "shot_done", message: `shot rendered`, data: { video_url: videoUrl, cost_usd: clipCost } });
      } else {
        const attempts = Number(shot.attempts ?? 0) + 1;
        const maxAttempts = Number(shot.max_attempts ?? 3);
        const isFinal = attempts >= maxAttempts;
        await supabase.from("shots").update({
          status: isFinal ? "dead" : "pending",
          attempts,
          error: "no video produced after polling/webhook timeout",
        }).eq("id", shotId);
        await logEvent({
          workspaceId, batchId, adId, shotId,
          stage: "shot_dead", level: isFinal ? "error" : "warn",
          message: isFinal ? "shot dead after max attempts" : "shot will retry",
          data: { attempts, max_attempts: maxAttempts },
        });
      }
    });

    return { shotId, status: videoUrl ? "done" : "dead" };
  }
);

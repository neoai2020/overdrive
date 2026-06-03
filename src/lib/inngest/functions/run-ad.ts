/**
 * runAd — per-ad orchestrator.
 *
 *   ad.created → write-script → [review checkpoint] → assign-presenter
 *              → generate-voiceover (audio + word timings)
 *              → build-shotlist
 *              → fan-out shots (shot.created events) and wait for completion
 *              → qa → assemble (Modal FFmpeg call) → mark ready
 */

import { inngest } from "@/lib/inngest/client";
import { NonRetriableError } from "inngest";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveLLM, resolveVoice } from "@/lib/providers/registry";
import { logEvent, addCost } from "@/lib/pipeline/events";
import { assembleFinalAd } from "@/lib/pipeline/assemble";
import * as writeScript from "@/lib/prompts/write-script";
import * as buildShotlist from "@/lib/prompts/build-shotlist";

const REVIEW_TIMEOUT = "24h";
const MAX_SHOT_WAIT_MINUTES = 15;

export const runAd = inngest.createFunction(
  { id: "run-ad", name: "Run ad pipeline", retries: 1, concurrency: { limit: 20 } },
  { event: "ad.created" },
  async ({ event, step }) => {
    const { adId, batchId, workspaceId } = event.data;

    // Load ad + version + batch.
    const { ad, version, batch } = await step.run("load-ad", async () => {
      const supabase = await createAdminClient();
      const { data: ad } = await supabase.from("ads").select("*").eq("id", adId).single();
      if (!ad) throw new NonRetriableError(`Ad ${adId} not found`);
      const { data: version } = await supabase
        .from("ad_versions")
        .select("*")
        .eq("id", ad.current_version_id as string)
        .single();
      if (!version) throw new NonRetriableError(`Ad version not found for ad ${adId}`);
      const { data: batch } = await supabase.from("batches").select("*").eq("id", batchId).single();
      if (!batch) throw new NonRetriableError(`Batch ${batchId} not found`);
      return { ad, version, batch };
    });

    const hook = (version.hook as string) ?? "";
    const style = (version.style as string) ?? "ugc_talking_head";
    const brief = batch.brief as Record<string, unknown> ?? {};
    const lengthSeconds = Number(version.length_seconds ?? 27);
    const runMode = batch.run_mode as string;

    // ───── Stage 4: write script ──────────────────────────────────────
    const script = await step.run("write-script", async () => {
      const supabase = await createAdminClient();
      await supabase.from("ads").update({ status: "generating" }).eq("id", adId);

      const { adapter, provider, model } = await resolveLLM("write_script", workspaceId);
      const result = await adapter.complete({
        messages: [
          { role: "system", content: writeScript.SYSTEM },
          { role: "user", content: writeScript.userPrompt({ brief, hook, style, lengthSeconds }) },
        ],
        json: true,
      });
      await logEvent({
        workspaceId, batchId, adId, stage: "write_script",
        message: `script written via ${provider}/${model}`,
        data: { provider, model, cost_usd: result.cost_usd, tokens: result.tokens },
      });
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.write_script", relatedTable: "ads", relatedId: adId });

      const parsed = result.json as { beats?: unknown[]; full_vo_text?: string; estimated_length_seconds?: number } | null;
      if (!parsed?.full_vo_text) throw new Error("write_script returned no full_vo_text");

      await supabase.from("ad_versions").update({
        script: parsed.full_vo_text,
        length_seconds: parsed.estimated_length_seconds ?? lengthSeconds,
        metadata: { ...(version.metadata as Record<string, unknown> ?? {}), beats: parsed.beats },
      }).eq("id", version.id as string);

      // Per-ad cost accumulator.
      await supabase.from("ads").update({ cost: Number(ad.cost ?? 0) + result.cost_usd }).eq("id", adId);

      return parsed;
    });

    // ───── Review checkpoint after script ─────────────────────────────
    if (runMode === "review_checkpoints") {
      await step.run("pause-for-script-review", async () => {
        const supabase = await createAdminClient();
        await supabase.from("ads").update({ status: "needs_review" }).eq("id", adId);
        await logEvent({ workspaceId, batchId, adId, stage: "review", message: "paused for script approval" });
      });
      const approval = await step.waitForEvent("script-approved", {
        event: "ad.script.approved",
        timeout: REVIEW_TIMEOUT,
        if: `event.data.adId == "${adId}"`,
      });
      if (!approval) {
        await step.run("abandon-script-on-timeout", async () => {
          const supabase = await createAdminClient();
          await supabase.from("ads").update({ status: "failed", error: "no script approval within 24h" }).eq("id", adId);
        });
        return { status: "cancelled" };
      }
    }

    // ───── Stage 5: assign presenter ──────────────────────────────────
    const presenterId = await step.run("assign-presenter", async () => {
      const supabase = await createAdminClient();
      const niche = (batch.offers as Record<string, unknown>)?.niche as string | undefined ?? null;

      // Pick first active presenter matching niche (system rows). If none match
      // niche, fall back to any system presenter.
      let presenter: { id: string } | null = null;
      if (niche) {
        const { data } = await supabase
          .from("presenters")
          .select("id")
          .eq("active", true)
          .contains("niche_fit", [niche])
          .limit(1)
          .maybeSingle();
        presenter = data as { id: string } | null;
      }
      if (!presenter) {
        const { data } = await supabase
          .from("presenters")
          .select("id")
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        presenter = data as { id: string } | null;
      }
      if (!presenter) throw new NonRetriableError("No active presenters available. Seed migration 0006 should have provided 25.");
      await supabase.from("ads").update({ presenter_id: presenter.id }).eq("id", adId);
      await logEvent({ workspaceId, batchId, adId, stage: "assign_presenter", message: `presenter ${presenter.id}` });
      return presenter.id;
    });

    // ───── Stage 6: generate voiceover ────────────────────────────────
    type VoiceStepResult = { id: string; durationSeconds: number; wordTimings: { word: string; start: number; end: number }[] };
    const voice: VoiceStepResult = await step.run("generate-voiceover", async () => {
      const supabase = await createAdminClient();
      const { adapter, provider, model } = await resolveVoice("voiceover", workspaceId);

      // Look up presenter's preferred voice.
      const { data: presenter } = await supabase
        .from("presenters")
        .select("voice_default")
        .eq("id", presenterId)
        .single();
      const voiceId = (presenter?.voice_default as string) || undefined;

      const result = await adapter.synthesize({ text: script.full_vo_text!, voiceId });

      // Upload audio to Supabase Storage.
      const path = `voiceovers/${workspaceId}/${adId}/${version.id}.mp3`;
      const { error: upErr } = await supabase.storage
        .from("generated")
        .upload(path, result.audio, { contentType: result.contentType, upsert: true });
      if (upErr) {
        // Bucket may not exist yet — create it.
        if (upErr.message.includes("not found") || upErr.message.includes("Bucket")) {
          await supabase.storage.createBucket("generated", { public: true });
          const { error: retryErr } = await supabase.storage
            .from("generated")
            .upload(path, result.audio, { contentType: result.contentType, upsert: true });
          if (retryErr) throw retryErr;
        } else {
          throw upErr;
        }
      }
      const { data: pub } = supabase.storage.from("generated").getPublicUrl(path);

      const { data: vo, error: voErr } = await supabase
        .from("voiceovers")
        .insert({
          workspace_id: workspaceId,
          ad_id: adId,
          ad_version_id: version.id as string,
          audio_url: pub.publicUrl,
          word_timings: result.wordTimings,
          duration_seconds: result.durationSeconds,
          provider,
          model,
          voice_id: voiceId,
          cost: result.cost_usd,
        })
        .select("id")
        .single();
      if (voErr || !vo) throw new Error(`Failed to insert voiceover: ${voErr?.message}`);

      await supabase.from("ad_versions").update({ voiceover_id: vo.id as string, voice_id: voiceId }).eq("id", version.id as string);
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.voiceover", relatedTable: "voiceovers", relatedId: vo.id as string });
      await supabase.from("ads").update({ cost: Number(ad.cost ?? 0) + Number(script_cost_acc(script)) + result.cost_usd }).eq("id", adId);
      await logEvent({
        workspaceId, batchId, adId, stage: "voiceover",
        message: `${result.durationSeconds.toFixed(1)}s audio via ${provider}/${model}`,
        data: { provider, model, duration_seconds: result.durationSeconds, cost_usd: result.cost_usd },
      });

      return { id: vo.id as string, durationSeconds: result.durationSeconds, wordTimings: result.wordTimings };
    });

    // ───── Stage 7: build shotlist ────────────────────────────────────
    const shotIds = await step.run("build-shotlist", async () => {
      const supabase = await createAdminClient();
      const { adapter, provider, model } = await resolveLLM("build_shotlist", workspaceId);

      const { data: presenterRow } = await supabase.from("presenters").select("name").eq("id", presenterId).single();
      const presenterName = (presenterRow?.name as string) ?? "Presenter";

      const result = await adapter.complete({
        messages: [
          { role: "system", content: buildShotlist.SYSTEM },
          { role: "user", content: buildShotlist.userPrompt({ fullVoText: script.full_vo_text!, wordTimings: voice.wordTimings, presenterName }) },
        ],
        json: true,
      });
      await addCost({ workspaceId, batchId, costUsd: result.cost_usd, reason: "pipeline.build_shotlist", relatedTable: "ads", relatedId: adId });
      const parsed = result.json as { shots?: { index: number; type: string; vo_text: string; vo_start: number; vo_end: number; on_screen?: string }[] } | null;
      const shots = parsed?.shots ?? [];
      if (shots.length === 0) throw new Error("build_shotlist returned no shots");

      const rows = shots.map((s) => ({
        workspace_id: workspaceId,
        ad_id: adId,
        ad_version_id: version.id as string,
        index: s.index,
        type: (s.type === "broll" ? "broll" : "talking") as "talking" | "broll",
        vo_text: s.vo_text,
        vo_start: s.vo_start,
        vo_end: s.vo_end,
        on_screen: s.on_screen ?? null,
        status: "pending" as const,
      }));
      const { data: created, error } = await supabase.from("shots").insert(rows).select("id");
      if (error || !created) throw new Error(`Failed to insert shots: ${error?.message}`);
      await logEvent({
        workspaceId, batchId, adId, stage: "build_shotlist",
        message: `${created.length} shots created`,
        data: { provider, model, shot_count: created.length, cost_usd: result.cost_usd },
      });
      return created.map((c) => c.id as string);
    });

    // ───── Fan-out shots & wait for them all to settle ────────────────
    await step.sendEvent("fan-out-shots", shotIds.map((shotId) => ({
      name: "shot.created" as const,
      data: { shotId, adId, batchId, workspaceId },
    })));

    // Poll shot rows until every one is terminal (done|dead) or we hit timeout.
    const shotsFinal = await step.run("wait-shots", async () => {
      const supabase = await createAdminClient();
      const deadline = Date.now() + MAX_SHOT_WAIT_MINUTES * 60 * 1000;
      // Loop with short sleeps so a crash resumes idempotently — but inside
      // a single step.run for compactness. For longer waits we'd hoist to
      // step.sleep + a polling step pair.
      while (Date.now() < deadline) {
        const { data: rows } = await supabase
          .from("shots")
          .select("id, status, video_url, cost")
          .in("id", shotIds);
        const all = rows ?? [];
        const terminal = all.filter((r) => ["done", "dead"].includes(r.status as string));
        if (terminal.length === all.length && all.length > 0) return all;
        await new Promise((r) => setTimeout(r, 5000));
      }
      return [];
    });

    // ───── Stage 9: QA ────────────────────────────────────────────────
    const qa = await step.run("qa", async () => {
      const done = shotsFinal.filter((s) => s.status === "done");
      const dead = shotsFinal.filter((s) => s.status === "dead");
      const fraction = shotsFinal.length === 0 ? 0 : done.length / shotsFinal.length;
      await logEvent({
        workspaceId, batchId, adId, stage: "qa",
        message: `qa: ${done.length}/${shotsFinal.length} shots done`,
        data: { done: done.length, dead: dead.length, fraction },
      });
      return { done, dead, fraction };
    });

    // Threshold for "partial success" — 80% rendered.
    if (qa.fraction < 0.8) {
      await step.run("mark-failed", async () => {
        const supabase = await createAdminClient();
        await supabase.from("ads").update({
          status: "failed",
          error: `only ${qa.done.length}/${qa.done.length + qa.dead.length} shots rendered`,
        }).eq("id", adId);
        await logEvent({ workspaceId, batchId, adId, stage: "ad_failed", level: "error", message: "ad failed QA threshold" });
      });
      return { status: "failed" };
    }

    // ───── Stage 10: assemble ─────────────────────────────────────────
    const final = await step.run("assemble", async () => {
      const supabase = await createAdminClient();
      const { data: voRow } = await supabase
        .from("voiceovers")
        .select("audio_url, word_timings, duration_seconds")
        .eq("id", voice.id)
        .single();
      const orderedShots = qa.done
        .map((s) => ({ id: s.id as string }))
        .filter((s) => Boolean(s.id));
      const { data: shotRows } = await supabase
        .from("shots")
        .select("id, video_url, vo_start, vo_end, on_screen, index")
        .in("id", orderedShots.map((s) => s.id))
        .order("index", { ascending: true });

      const assembled = await assembleFinalAd({
        workspaceId,
        adId,
        adVersionId: version.id as string,
        audioUrl: voRow?.audio_url as string,
        wordTimings: voRow?.word_timings as { word: string; start: number; end: number }[],
        shots: (shotRows ?? []).map((r) => ({
          videoUrl: r.video_url as string,
          voStart: Number(r.vo_start),
          voEnd: Number(r.vo_end),
          onScreen: (r.on_screen as string | null) ?? undefined,
        })),
      });

      const newStatus = qa.dead.length === 0 ? "ready" : "partial";
      await supabase.from("ad_versions").update({
        video_url: assembled.videoUrl,
        thumbnail_url: assembled.thumbnailUrl,
        length_seconds: Math.round(assembled.durationSeconds),
      }).eq("id", version.id as string);

      await supabase.from("ads").update({
        status: newStatus,
        cost: Number(ad.cost ?? 0) + assembled.costUsd,
      }).eq("id", adId);

      await addCost({ workspaceId, batchId, costUsd: assembled.costUsd, reason: "pipeline.assemble", relatedTable: "ads", relatedId: adId });
      await logEvent({
        workspaceId, batchId, adId, stage: "assemble",
        message: `assembled (${newStatus}) ${assembled.durationSeconds.toFixed(1)}s`,
        data: { video_url: assembled.videoUrl, status: newStatus, dead_shots: qa.dead.length },
      });
      return { videoUrl: assembled.videoUrl, status: newStatus };
    });

    return { status: final.status, videoUrl: final.videoUrl };
  }
);

/** Tiny helper to suppress an unused-var lint while keeping the chain readable. */
function script_cost_acc(_s: unknown): number { return 0; }

/**
 * Service layer — every long-running operation has a clean function here.
 * Phase 1: client-friendly mocks that persist to Supabase + simulate progress.
 * Phase 2: swap implementations to enqueue jobs against a worker queue.
 */

import { createClient } from "@/lib/supabase/client";
import type { AdStyle, BatchRunMode, Json } from "@/lib/types/database";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// generateBatch — creates a batch row + 'jobs' row, then simulates progress.
// Returns the new batch id immediately so the wizard can redirect.
// ---------------------------------------------------------------------------

export interface GenerateBatchInput {
  workspaceId: string;
  offerId?: string;
  scopedAdSetId?: string;
  angle?: string;
  customAngle?: string;
  styleMix: AdStyle[];
  size: number;
  runMode: BatchRunMode;
  templateId?: string;
  presetId?: string;
}

export async function generateBatch(input: GenerateBatchInput): Promise<{ batchId: string }> {
  const supabase = createClient();
  const idempotencyKey = nanoid(16);

  const { data: batch, error } = await supabase
    .from("batches")
    .insert({
      workspace_id: input.workspaceId,
      offer_id: input.offerId ?? null,
      scoped_ad_set_id: input.scopedAdSetId ?? null,
      angle: input.angle ?? null,
      custom_angle: input.customAngle ?? null,
      style_mix: input.styleMix,
      size: input.size,
      run_mode: input.runMode,
      status: "queued",
      progress_step: "queued",
      progress_pct: 0,
      idempotency_key: idempotencyKey,
      template_id: input.templateId ?? null,
      preset_id: input.presetId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!batch) throw new Error("Failed to create batch");

  // Insert the corresponding job row (Phase 2: worker picks this up)
  await supabase.from("jobs").insert({
    workspace_id: input.workspaceId,
    kind: "generate_batch",
    status: "queued",
    subject_table: "batches",
    subject_id: batch.id,
    payload: input as unknown as Json,
    idempotency_key: idempotencyKey,
  });

  // Phase 1 mock: simulate the pipeline progressing.
  // In Phase 2 this entire block goes away — the worker drives status updates.
  void simulateBatchProgress(batch.id, input);

  return { batchId: batch.id };
}

const PIPELINE_STEPS = [
  { step: "reading_offer",  pct: 10, delay: 1500 },
  { step: "generating_hooks", pct: 30, delay: 2500 },
  { step: "writing_scripts", pct: 55, delay: 3500 },
  { step: "selecting_talent", pct: 70, delay: 1500 },
  { step: "rendering_videos", pct: 95, delay: 4000 },
  { step: "done", pct: 100, delay: 500 },
] as const;

async function simulateBatchProgress(batchId: string, input: GenerateBatchInput) {
  const supabase = createClient();

  await sleep(800);
  await supabase.from("batches").update({ status: "generating", progress_step: "starting", progress_pct: 5 }).eq("id", batchId);

  for (const stage of PIPELINE_STEPS) {
    await sleep(stage.delay);
    await supabase.from("batches").update({ progress_step: stage.step, progress_pct: stage.pct }).eq("id", batchId);
  }

  // Create the mock ads
  const ads = Array.from({ length: input.size }).map((_, i) => ({
    workspace_id: input.workspaceId,
    offer_id: input.offerId ?? null,
    batch_id: batchId,
    name: `Mock ad ${i + 1}`,
    status: "ready" as const,
  }));

  const { data: createdAds } = await supabase.from("ads").insert(ads).select("id");

  // Insert one version per ad
  if (createdAds) {
    const versions = createdAds.map((a: { id: string }, i: number) => ({
      ad_id: a.id,
      version_number: 1,
      hook: mockHook(input, i),
      script: mockScript(input, i),
      style: input.styleMix[i % input.styleMix.length],
      length_seconds: 22 + (i % 5) * 3,
      thumbnail_url: null,
      voice_id: "voice_mock_001",
      talent_id: `talent_${(i % 5) + 1}`,
    }));
    await supabase.from("ad_versions").insert(versions);
  }

  await supabase
    .from("batches")
    .update({
      status: input.runMode === "autopilot" ? "ready" : "needs_review",
      progress_step: "complete",
      progress_pct: 100,
      completed_at: new Date().toISOString(),
      credits_spent: input.size * 8,
    })
    .eq("id", batchId);

  await supabase
    .from("jobs")
    .update({ status: "succeeded", progress_pct: 100, completed_at: new Date().toISOString() })
    .eq("subject_id", batchId)
    .eq("subject_table", "batches");
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function mockHook(input: GenerateBatchInput, i: number): string {
  const hooks = [
    "I was 47 lbs heavier 6 months ago — here's what changed",
    "Stop scrolling. This $7 method made me $4k last week.",
    "The 'doctor's secret' big pharma doesn't want you to see",
    "POV: you stop doing this one thing and the weight falls off",
    "I quit the gym and got leaner. Here's the unhinged truth.",
    "3 reasons why your last ad bombed (and how to fix it)",
    "My mom tried this for 30 days. The before/after is wild.",
    "Watch what happens at 0:14 — you won't believe it",
    "Forget keto. This is what actually melts belly fat at 50.",
    "If your CPMs are over $30, you're doing this one thing wrong",
  ];
  return hooks[(i + (input.angle?.length ?? 0)) % hooks.length];
}

function mockScript(input: GenerateBatchInput, i: number): string {
  return `[Hook] ${mockHook(input, i)}\n\n[Beat 1] Setup the problem most ${input.angle ?? "people"} face.\n[Beat 2] Reveal what failed before.\n[Beat 3] Introduce the mechanism behind the solution.\n[Beat 4] Show proof — testimonial / before-after / data.\n[CTA] Soft close: "tap the link if you want to try this for yourself."`;
}

// ---------------------------------------------------------------------------
// analyzeOffer — pretends to scrape the URL and fill in avatar/angles/objections
// ---------------------------------------------------------------------------

export async function analyzeOffer(offerId: string, _url: string) {
  const supabase = createClient();

  await sleep(1800);

  const avatar = {
    age_range: "35–55",
    gender: "mixed (slight female lean)",
    income_range: "$50k–$150k",
    pain: "Weight loss plateau, low energy, frustration with diets that don't stick",
    triggers: ["just turned 40", "doctor's visit", "summer coming up", "wedding upcoming"],
  };
  const angles = [
    { name: "Failed diets confession", summary: "I tried keto, paleo, intermittent fasting — nothing worked until…", confidence: 0.88 },
    { name: "Doctor authority", summary: "A weight-loss MD's overlooked metabolic trick.", confidence: 0.81 },
    { name: "Before/after transformation", summary: "Real customer 60-day transformation reel.", confidence: 0.76 },
    { name: "Mechanism education", summary: "How GLP-1 mimickers actually work in the body.", confidence: 0.71 },
  ];
  const objections = [
    { text: "Is this another scam?", response_angle: "Show third-party clinical study + transparent ingredient list." },
    { text: "Will it work for me at my age?", response_angle: "Highlight customer stories at 50+ with metabolic data." },
    { text: "Will I gain it back?", response_angle: "Frame as a 90-day reset, not a forever diet." },
  ];

  await supabase
    .from("offers")
    .update({
      avatar: avatar as unknown as Json,
      angles: angles as unknown as Json,
      objections: objections as unknown as Json,
      last_researched_at: new Date().toISOString(),
    })
    .eq("id", offerId);
}

// ---------------------------------------------------------------------------
// pushToMeta — stub. Phase 2: enqueue real Graph API push.
// ---------------------------------------------------------------------------

export async function pushToMeta(adIds: string[], adSetId: string): Promise<{ pushed: number }> {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("workspace_id").maybeSingle();
  const workspace_id = (profile as { workspace_id?: string } | null)?.workspace_id;
  if (!workspace_id) throw new Error("No workspace");

  await sleep(1200);
  const rows = adIds.map((ad_id) => ({
    workspace_id,
    ad_id,
    ad_set_id: adSetId,
    status: "pushed" as const,
    pushed_at: new Date().toISOString(),
    meta_ad_id: `mock_meta_${nanoid(10)}`,
  }));
  // upsert so re-push is idempotent on (ad_id, ad_set_id)
  await supabase.from("ad_placements").upsert(rows, { onConflict: "ad_id,ad_set_id" });
  return { pushed: adIds.length };
}

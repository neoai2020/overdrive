/**
 * Service layer — every long-running operation has a clean function here.
 * Phase 2: generateBatch posts to /api/batches which fires the Inngest pipeline.
 * Mock helpers below still drive `analyzeOffer` and `pushToMeta` until real
 * provider integrations land.
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
  // Phase 2: kick off via the real API. The endpoint validates credits,
  // inserts the batch row, and fires the Inngest `batch.created` event.
  const idempotencyKey = nanoid(16);
  const res = await fetch("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offer_id: input.offerId ?? null,
      scoped_ad_set_id: input.scopedAdSetId ?? null,
      angle: input.angle ?? null,
      custom_angle: input.customAngle ?? null,
      style_mix: input.styleMix,
      size: input.size,
      run_mode: input.runMode,
      idempotency_key: idempotencyKey,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to create batch (HTTP ${res.status})`);
  }
  const { batchId } = (await res.json()) as { batchId: string };
  return { batchId };
}

// Phase 1 simulator + mock generators removed in Phase 2.
// The real pipeline lives in src/lib/inngest/functions/* and is kicked
// off by POST /api/batches.

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

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

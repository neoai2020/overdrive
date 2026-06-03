/**
 * POST /api/batches
 *
 * The two-phase Phase A kickoff. Steps:
 *   1. Authenticate; resolve workspace.
 *   2. Validate input (offer_id, angle, count, mode, optional cost_cap).
 *   3. Pre-flight credit/cost check against the workspace pool.
 *   4. Insert batch row (status=queued).
 *   5. Fire inngest event `batch.created`.
 *   6. Return { batchId } in milliseconds.
 *
 * The browser then subscribes via Supabase Realtime to that row.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const ESTIMATE_PER_AD_USD = 6;  // conservative pre-flight: ~5 shots × $1 + LLM/voice overhead

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 403 });
  const workspaceId = profile.workspace_id as string;

  let body: {
    offer_id?: string;
    scoped_ad_set_id?: string | null;
    angle?: string;
    custom_angle?: string;
    style_mix?: string[];
    size?: number;
    run_mode?: "autopilot" | "review_checkpoints";
    cost_cap?: number;
    idempotency_key?: string;
    raw_input?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const size = Math.max(1, Math.min(50, body.size ?? 10));
  const projectedCost = size * ESTIMATE_PER_AD_USD;

  // Workspace credit pre-flight (1 credit = $0.01).
  const { data: ws } = await supabase
    .from("workspaces")
    .select("credits_total, credits_used")
    .eq("id", workspaceId)
    .single();
  const remainingCredits = (ws?.credits_total ?? 0) - (ws?.credits_used ?? 0);
  const projectedCredits = Math.ceil(projectedCost * 100);
  if (remainingCredits < projectedCredits) {
    return NextResponse.json({
      error: `Not enough credits. Need ~${projectedCredits}, have ${remainingCredits}.`,
      remainingCredits,
      projectedCredits,
    }, { status: 402 });
  }

  // Cost cap can be tighter than the workspace pool but never looser.
  const costCap = body.cost_cap && body.cost_cap > 0 ? Math.min(body.cost_cap, projectedCost * 1.5) : projectedCost * 1.5;

  const { data: batch, error } = await supabase
    .from("batches")
    .insert({
      workspace_id: workspaceId,
      offer_id: body.offer_id ?? null,
      scoped_ad_set_id: body.scoped_ad_set_id ?? null,
      angle: body.angle ?? "pain",
      custom_angle: body.custom_angle ?? null,
      style_mix: body.style_mix && body.style_mix.length > 0 ? body.style_mix : ["ugc_talking_head"],
      size,
      run_mode: body.run_mode ?? "autopilot",
      status: "queued",
      progress_step: "queued",
      progress_pct: 0,
      idempotency_key: body.idempotency_key ?? null,
      cost_cap: costCap,
      cost_estimate: projectedCost,
      cost_spent: 0,
      created_by: user.id,
      metadata: { raw_input: body.raw_input ?? null },
    })
    .select("id")
    .single();

  if (error || !batch) {
    return NextResponse.json({ error: error?.message || "Failed to create batch" }, { status: 500 });
  }

  await inngest.send({
    name: "batch.created",
    data: { batchId: batch.id as string, workspaceId },
  });

  return NextResponse.json({ batchId: batch.id, projectedCost, costCap });
}

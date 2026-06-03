/**
 * POST /api/batches/:id/approve
 *
 * Resumes a review-mode batch/ad by emitting the Inngest event the parent
 * function is waiting on. Two stages:
 *   { stage: "hooks", edits?: [...] }     → batch.hooks.approved
 *   { stage: "script", adId, editedScript? } → ad.script.approved
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: batchId } = await ctx.params;

  const { data: batch } = await supabase
    .from("batches")
    .select("id, workspace_id")
    .eq("id", batchId)
    .single();
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { stage?: "hooks" | "script"; adId?: string; edits?: { adId: string; hook: string }[]; editedScript?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  if (body.stage === "hooks") {
    await inngest.send({
      name: "batch.hooks.approved",
      data: { batchId, edits: body.edits },
    });
    // Optimistically reset the batch status — the function will overwrite as it progresses.
    await supabase.from("batches").update({ status: "generating" }).eq("id", batchId);
    return NextResponse.json({ ok: true });
  }

  if (body.stage === "script" && body.adId) {
    await inngest.send({
      name: "ad.script.approved",
      data: { adId: body.adId, batchId, editedScript: body.editedScript },
    });
    await supabase.from("ads").update({ status: "generating" }).eq("id", body.adId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}

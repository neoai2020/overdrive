/**
 * GET /api/batches/:id
 *
 * Returns batch + ads + shots snapshot. The browser primarily uses Realtime
 * subscriptions on `batches` / `ads` / `shots`; this endpoint is the
 * initial-render + fallback path.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await ctx.params;

  const { data: batch, error } = await supabase
    .from("batches")
    .select("*, offers(name, niche)")
    .eq("id", id)
    .single();
  if (error || !batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ads } = await supabase
    .from("ads")
    .select("id, name, status, cost, error, presenter_id, current_version_id, ad_versions!ads_current_version_fk(hook, video_url, thumbnail_url, length_seconds)")
    .eq("batch_id", id)
    .order("created_at", { ascending: true });

  // Lightweight shot rollup per ad — count by status — to keep payload small.
  const adIds = (ads ?? []).map((a) => a.id as string);
  let shotRollup: Record<string, { total: number; done: number; dead: number; generating: number }> = {};
  if (adIds.length > 0) {
    const { data: shots } = await supabase
      .from("shots")
      .select("ad_id, status")
      .in("ad_id", adIds);
    shotRollup = {};
    for (const id of adIds) shotRollup[id] = { total: 0, done: 0, dead: 0, generating: 0 };
    for (const s of shots ?? []) {
      const r = shotRollup[s.ad_id as string];
      if (!r) continue;
      r.total++;
      if (s.status === "done") r.done++;
      else if (s.status === "dead") r.dead++;
      else if (s.status === "generating") r.generating++;
    }
  }

  return NextResponse.json({ batch, ads: ads ?? [], shotRollup });
}

/**
 * POST /api/campaigns/:id/push
 *
 * Body: { adIds: string[]; targetAdSetId?: string }
 *
 * Pushes selected ads to Meta as PAUSED drafts via the pushToMeta() adapter.
 * The adapter is currently stubbed in src/lib/services/index.ts — drops in
 * the real Meta Marketing API call when OAuth is wired up.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushToMeta } from "@/lib/services";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: campaignId } = await ctx.params;

  let body: { adIds?: string[]; targetAdSetId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const adIds = body.adIds ?? [];
  if (adIds.length === 0) return NextResponse.json({ error: "No ads to push" }, { status: 400 });

  // Resolve target ad set: explicit ad-set id, or campaign's first ad set.
  let adSetId = body.targetAdSetId;
  if (!adSetId) {
    const { data: ads } = await supabase
      .from("ad_sets")
      .select("id")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    adSetId = ads?.id as string | undefined;
  }
  if (!adSetId) return NextResponse.json({ error: "Campaign has no ad sets" }, { status: 400 });

  const result = await pushToMeta(adIds, adSetId);
  return NextResponse.json(result);
}

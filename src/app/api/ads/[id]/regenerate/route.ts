/**
 * POST /api/ads/:id/regenerate
 *
 * Body: { fromStage?: "script" | "voice" | "shotlist" | "shots" | "assemble" }
 *
 * Creates a new ad_version (so old artifacts are preserved) and re-fires
 * `ad.created` so the entire runAd pipeline re-runs against the new version.
 *
 * For finer-grained stage replay we'd add per-stage Inngest functions; for v1
 * "rerun the whole ad" is the safe default.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: adId } = await ctx.params;

  const { data: ad, error } = await supabase
    .from("ads")
    .select("workspace_id, batch_id, current_version_id, offer_id, name, ad_versions!ads_current_version_fk(version_number, hook, style)")
    .eq("id", adId)
    .single();
  if (error || !ad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevVersion = Array.isArray(ad.ad_versions) ? ad.ad_versions[0] : ad.ad_versions;
  const nextVersionNumber = ((prevVersion?.version_number as number) ?? 0) + 1;

  // Clone version with new number; reset video/script artifacts.
  const { data: newVersion, error: vErr } = await supabase
    .from("ad_versions")
    .insert({
      ad_id: adId,
      version_number: nextVersionNumber,
      hook: prevVersion?.hook ?? null,
      style: prevVersion?.style ?? "ugc_talking_head",
    })
    .select("id")
    .single();
  if (vErr || !newVersion) return NextResponse.json({ error: vErr?.message || "Failed to clone version" }, { status: 500 });

  await supabase.from("ads").update({
    current_version_id: newVersion.id as string,
    status: "queued",
    error: null,
  }).eq("id", adId);

  await inngest.send({
    name: "ad.created",
    data: { adId, batchId: ad.batch_id as string, workspaceId: ad.workspace_id as string },
  });

  return NextResponse.json({ ok: true, newVersionId: newVersion.id, versionNumber: nextVersionNumber });
}

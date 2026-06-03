/**
 * Video-provider webhook → Inngest event bridge.
 *
 *   POST /api/webhooks/video?provider=fal
 *
 * Providers POST when a video job completes. We look up the matching shot
 * row by provider_job_id and emit `shot.video.done` (or `.failed`), which
 * unblocks runShot's `step.waitForEvent`.
 *
 * Signature verification is provider-specific — left as a TODO per provider
 * (fal's HMAC needs the shared webhook secret; Higgsfield's is bearer).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveExplicit } from "@/lib/providers/registry";
import { inngest } from "@/lib/inngest/client";
import type { VideoProvider } from "@/lib/providers/types";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "missing provider param" }, { status: 400 });

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  // Pull a (provider, model, params) we know how to instantiate. We don't
  // actually need it tied to a config row — webhook parsing is provider-only.
  let adapter: VideoProvider;
  try {
    const resolved = await resolveExplicit<VideoProvider>("video", provider, "webhook", {});
    adapter = resolved.adapter;
  } catch {
    return NextResponse.json({ error: `no adapter for provider ${provider}` }, { status: 400 });
  }
  if (!adapter.parseWebhook) {
    return NextResponse.json({ error: `provider ${provider} does not implement parseWebhook` }, { status: 400 });
  }

  let jobId: string;
  let status: Awaited<ReturnType<NonNullable<VideoProvider["parseWebhook"]>>>["status"];
  try {
    ({ jobId, status } = await adapter.parseWebhook(headers, rawBody));
  } catch (e) {
    return NextResponse.json({ error: "failed to parse webhook", detail: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  // Look up the shot for this job id.
  const supabase = await createAdminClient();
  const { data: shot } = await supabase
    .from("shots")
    .select("id, ad_id, ad_version_id, workspace_id")
    .eq("provider_job_id", jobId)
    .maybeSingle();

  if (!shot) {
    // Drop unknown jobs silently to avoid retry storms from cleanup jobs.
    return NextResponse.json({ ok: true, ignored: "no shot for jobId" });
  }

  if (status.status === "done") {
    await inngest.send({
      name: "shot.video.done",
      data: {
        shotId: shot.id as string,
        jobId,
        videoUrl: status.videoUrl,
        durationSeconds: status.durationSeconds,
        cost_usd: status.cost_usd,
      },
    });
  } else if (status.status === "failed") {
    await inngest.send({
      name: "shot.video.failed",
      data: { shotId: shot.id as string, jobId, error: status.error, retryable: status.retryable },
    });
  }

  return NextResponse.json({ ok: true });
}

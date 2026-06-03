/**
 * FFmpeg assembly client.
 *
 * In production: posts to the Modal endpoint (Python FFmpeg service) which
 * does the heavy lifting (concat, audio mux, word-level caption burn-in,
 * 9:16 transcode, thumbnail) and uploads the final MP4 to Supabase Storage.
 *
 * In dev / when MODAL_FFMPEG_ENDPOINT is unset: a MockFfmpeg fallback so the
 * pipeline runs end-to-end without external infra. It just reuses the first
 * shot's video URL as the "final" video.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type AssembleInput = {
  workspaceId: string;
  adId: string;
  adVersionId: string;
  audioUrl: string;
  wordTimings: { word: string; start: number; end: number }[];
  shots: { videoUrl: string; voStart: number; voEnd: number; onScreen?: string }[];
};

export type AssembleResult = {
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  bytes: number;
  costUsd: number;
};

const MODAL_ENDPOINT = process.env.MODAL_FFMPEG_ENDPOINT;
const MODAL_SECRET = process.env.MODAL_FFMPEG_SECRET;

export async function assembleFinalAd(input: AssembleInput): Promise<AssembleResult> {
  if (MODAL_ENDPOINT) {
    return assembleViaModal(input);
  }
  return assembleMock(input);
}

async function assembleViaModal(input: AssembleInput): Promise<AssembleResult> {
  const supabase = await createAdminClient();
  const finalPath = `ads/${input.workspaceId}/${input.adId}/${input.adVersionId}.mp4`;
  const thumbPath = `ads/${input.workspaceId}/${input.adId}/${input.adVersionId}.jpg`;

  const res = await fetch(MODAL_ENDPOINT!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(MODAL_SECRET ? { "X-Modal-Secret": MODAL_SECRET } : {}),
    },
    body: JSON.stringify({
      shots: input.shots,
      audio_url: input.audioUrl,
      word_timings: input.wordTimings,
      // Modal returns presigned upload tokens — pass them so Modal uploads
      // straight to Storage without round-tripping through our server.
      upload: {
        bucket: "generated",
        video_path: finalPath,
        thumb_path: thumbPath,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      options: { aspect_ratio: "9:16", caption_style: "ugc-bouncing" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Modal ffmpeg ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    duration_seconds: number;
    bytes: number;
    cost_usd: number;
  };

  const { data: videoPub } = supabase.storage.from("generated").getPublicUrl(finalPath);
  const { data: thumbPub } = supabase.storage.from("generated").getPublicUrl(thumbPath);
  return {
    videoUrl: videoPub.publicUrl,
    thumbnailUrl: thumbPub.publicUrl,
    durationSeconds: data.duration_seconds,
    bytes: data.bytes,
    costUsd: data.cost_usd,
  };
}

function assembleMock(input: AssembleInput): AssembleResult {
  // Fall back: use the first shot's video as the "final". Good enough for
  // local dev — the wired UI will render *something* playable.
  const firstShot = input.shots[0]?.videoUrl ?? "";
  return {
    videoUrl: firstShot,
    thumbnailUrl: firstShot ? firstShot.replace(/\.mp4$/, ".jpg") : "",
    durationSeconds: input.shots[input.shots.length - 1]?.voEnd ?? 0,
    bytes: 0,
    costUsd: 0,
  };
}

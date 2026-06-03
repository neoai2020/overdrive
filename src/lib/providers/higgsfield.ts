/**
 * Higgsfield Soul adapter — placeholder shape, ready to wire when you have
 * API access. Higgsfield's API is gated/enterprise as of writing; this is
 * the contract we'll need.
 *
 * Why keep this file: when access lands, the only changes are
 *   1. set HIGGSFIELD_API_KEY (or via admin keys),
 *   2. flip the `video` task row in /app/admin/models to provider=higgsfield,
 * and the entire pipeline switches without touching any other code.
 *
 * The body of submit/poll is best-guess from public docs; revisit when you
 * have the real spec.
 */

import {
  type VideoProvider,
  type VideoRequest,
  type VideoSubmitResult,
  type VideoJobStatus,
  type ProviderInit,
  ProviderError,
} from "./types";

const BASE = "https://api.higgsfield.ai/v1";  // tentative — confirm on access

export class HiggsfieldVideoProvider implements VideoProvider {
  readonly name = "higgsfield";
  readonly model: string;
  readonly supportsWebhook = true;
  private apiKey: string;
  private params: Record<string, unknown>;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "Higgsfield API key is not configured. Add one at /app/admin/keys or set HIGGSFIELD_API_KEY. " +
          "(Note: Higgsfield API access is currently gated — request access via their team.)",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "soul-character-v1-lipsync";
    this.params = init.params || {};
  }

  async submit(req: VideoRequest): Promise<VideoSubmitResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      prompt: req.prompt,
      duration_seconds: req.durationSeconds,
      aspect_ratio: req.aspectRatio ?? "9:16",
      ...this.params,
    };
    if (req.referenceCharacterId) body.character_id = req.referenceCharacterId;
    else if (req.startImageUrl) body.reference_image_url = req.startImageUrl;
    if (req.voiceAudioUrl) body.audio_url = req.voiceAudioUrl;
    if (req.webhookUrl) body.webhook_url = req.webhookUrl;
    if (req.idempotencyKey) body.idempotency_key = req.idempotencyKey;

    const res = await fetch(`${BASE}/videos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderError(`higgsfield submit ${res.status}: ${text.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: text,
      });
    }
    const data = (await res.json()) as { job_id: string };
    return { jobId: data.job_id, provider: this.name, model: this.model };
  }

  async poll(jobId: string): Promise<VideoJobStatus> {
    const start = Date.now();
    const res = await fetch(`${BASE}/videos/${jobId}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderError(`higgsfield poll ${res.status}: ${text.slice(0, 400)}`, {
        retryable: res.status >= 500,
        status: res.status,
      });
    }
    const data = (await res.json()) as {
      status: "queued" | "running" | "completed" | "failed";
      video_url?: string;
      duration?: number;
      error?: string;
      cost_usd?: number;
    };
    if (data.status === "queued") return { status: "pending", cost_usd: 0 };
    if (data.status === "running") return { status: "running", cost_usd: 0 };
    if (data.status === "failed") {
      return { status: "failed", error: data.error ?? "higgsfield failed", cost_usd: 0, retryable: true };
    }
    if (data.status === "completed" && data.video_url) {
      return {
        status: "done",
        videoUrl: data.video_url,
        durationSeconds: data.duration ?? 0,
        cost_usd: data.cost_usd ?? 1.0,
        latency_ms: Date.now() - start,
      };
    }
    return { status: "failed", error: "unknown higgsfield response", cost_usd: 0, retryable: true };
  }

  async parseWebhook(_headers: Record<string, string>, body: string): Promise<{ jobId: string; status: VideoJobStatus }> {
    const parsed = JSON.parse(body) as {
      job_id: string;
      status: "completed" | "failed";
      video_url?: string;
      duration?: number;
      error?: string;
      cost_usd?: number;
    };
    if (parsed.status === "completed" && parsed.video_url) {
      return {
        jobId: parsed.job_id,
        status: {
          status: "done",
          videoUrl: parsed.video_url,
          durationSeconds: parsed.duration ?? 0,
          cost_usd: parsed.cost_usd ?? 1.0,
          latency_ms: 0,
        },
      };
    }
    return {
      jobId: parsed.job_id,
      status: { status: "failed", error: parsed.error ?? "higgsfield webhook error", cost_usd: 0, retryable: true },
    };
  }
}

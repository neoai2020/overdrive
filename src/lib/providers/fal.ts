/**
 * fal.ai adapters — used for both VIDEO (Kling, Veo, Sora, Hunyuan…) and
 * optionally IMAGE (Flux). The same adapter class shape, different endpoints.
 *
 * fal queue API:
 *   POST  https://queue.fal.run/{model_id}            → { request_id }
 *   GET   https://queue.fal.run/{model_id}/requests/{id}/status
 *   GET   https://queue.fal.run/{model_id}/requests/{id}            ← final result
 *
 * Webhooks: pass `?webhook_url=...` on submit; fal POSTs `{status, request_id, payload}`
 * to that URL on completion. We use this to fire an Inngest `shot.video.done` event.
 *
 * Docs: https://docs.fal.ai/serverless-client/queue
 */

import {
  type VideoProvider,
  type VideoRequest,
  type VideoSubmitResult,
  type VideoJobStatus,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type ProviderInit,
  ProviderError,
} from "./types";

const QUEUE_BASE = "https://queue.fal.run";

// Approximate cost per request for the models we care about (USD). Update via
// pipeline_config.params.cost_override if these drift. Mostly used for the
// pre-video gate; actual billing comes from fal's invoice.
const VIDEO_COST_ESTIMATE: Record<string, number> = {
  "fal-ai/kling-video/v2.5/pro/image-to-video": 0.95,
  "fal-ai/kling-video/v2.5/pro/text-to-video":  0.95,
  "fal-ai/veo3/fast/image-to-video":             1.50,
  "fal-ai/sora-2/text-to-video":                 1.20,
  "fal-ai/hunyuan-video/image-to-video":         0.60,
};

const IMAGE_COST_ESTIMATE: Record<string, number> = {
  "fal-ai/flux/dev":         0.025,
  "fal-ai/flux-pro/v1.1":    0.04,
};

/* ─── Video ────────────────────────────────────────────────────────────── */

export class FalVideoProvider implements VideoProvider {
  readonly name = "fal";
  readonly model: string;
  readonly supportsWebhook = true;
  private apiKey: string;
  private params: Record<string, unknown>;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "fal.ai key is not configured. Add one at /app/admin/keys or set FAL_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "fal-ai/kling-video/v2.5/pro/image-to-video";
    this.params = init.params || {};
  }

  async submit(req: VideoRequest): Promise<VideoSubmitResult> {
    // Build the model-specific input. Different fal endpoints want different shapes.
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      duration: clampDuration(req.durationSeconds, this.model),
      aspect_ratio: req.aspectRatio ?? "9:16",
      ...this.params,
    };
    if (req.startImageUrl && /image-to-video/.test(this.model)) {
      input.image_url = req.startImageUrl;
    }
    // Lip-sync hint — Kling supports `audio_url`; veo/sora ignore it.
    if (req.voiceAudioUrl && this.model.includes("kling")) {
      input.audio_url = req.voiceAudioUrl;
    }

    const url = req.webhookUrl
      ? `${QUEUE_BASE}/${this.model}?fal_webhook=${encodeURIComponent(req.webhookUrl)}`
      : `${QUEUE_BASE}/${this.model}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Key ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(req.idempotencyKey ? { "Idempotency-Key": req.idempotencyKey } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderError(`fal submit ${res.status}: ${text.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: text,
      });
    }
    const data = (await res.json()) as { request_id: string };
    return { jobId: data.request_id, provider: this.name, model: this.model };
  }

  async poll(jobId: string): Promise<VideoJobStatus> {
    const start = Date.now();
    const statusRes = await fetch(`${QUEUE_BASE}/${this.model}/requests/${jobId}/status`, {
      headers: { "Authorization": `Key ${this.apiKey}` },
    });
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new ProviderError(`fal poll status ${statusRes.status}: ${text.slice(0, 400)}`, {
        retryable: statusRes.status >= 500,
        status: statusRes.status,
      });
    }
    const status = (await statusRes.json()) as { status: string; queue_position?: number };

    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
      return { status: status.status === "IN_QUEUE" ? "pending" : "running", cost_usd: 0, progress: status.queue_position };
    }
    if (status.status !== "COMPLETED") {
      return { status: "failed", error: `unexpected status ${status.status}`, cost_usd: 0, retryable: true };
    }

    // Fetch the final result.
    const resultRes = await fetch(`${QUEUE_BASE}/${this.model}/requests/${jobId}`, {
      headers: { "Authorization": `Key ${this.apiKey}` },
    });
    if (!resultRes.ok) {
      const text = await resultRes.text();
      throw new ProviderError(`fal poll result ${resultRes.status}: ${text.slice(0, 400)}`, {
        retryable: resultRes.status >= 500,
        status: resultRes.status,
      });
    }
    const result = (await resultRes.json()) as {
      video?: { url: string };
      duration?: number;
    };
    const videoUrl = result.video?.url;
    if (!videoUrl) {
      return { status: "failed", error: "fal completed but no video url", cost_usd: 0, retryable: true };
    }
    return {
      status: "done",
      videoUrl,
      durationSeconds: result.duration ?? 0,
      cost_usd: VIDEO_COST_ESTIMATE[this.model] ?? 0,
      latency_ms: Date.now() - start,
    };
  }

  async parseWebhook(_headers: Record<string, string>, body: string): Promise<{ jobId: string; status: VideoJobStatus }> {
    // fal posts: { request_id, gateway_request_id, status: 'OK'|'ERROR', payload, error }
    const parsed = JSON.parse(body) as {
      request_id: string;
      status: "OK" | "ERROR";
      payload?: { video?: { url: string }; duration?: number };
      error?: string;
    };
    if (parsed.status === "OK" && parsed.payload?.video?.url) {
      return {
        jobId: parsed.request_id,
        status: {
          status: "done",
          videoUrl: parsed.payload.video.url,
          durationSeconds: parsed.payload.duration ?? 0,
          cost_usd: VIDEO_COST_ESTIMATE[this.model] ?? 0,
          latency_ms: 0,
        },
      };
    }
    return {
      jobId: parsed.request_id,
      status: { status: "failed", error: parsed.error || "fal webhook error", cost_usd: 0, retryable: true },
    };
  }
}

function clampDuration(seconds: number, model: string): number {
  // Most fal video models cap at 5-10 seconds. Be conservative.
  if (model.includes("kling")) return Math.min(10, Math.max(5, Math.round(seconds)));
  if (model.includes("veo")) return Math.min(8, Math.max(4, Math.round(seconds)));
  if (model.includes("sora")) return Math.min(10, Math.max(5, Math.round(seconds)));
  return Math.min(10, Math.max(3, Math.round(seconds)));
}

/* ─── Image ────────────────────────────────────────────────────────────── */

export class FalImageProvider implements ImageProvider {
  readonly name = "fal";
  readonly model: string;
  private apiKey: string;
  private params: Record<string, unknown>;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "fal.ai key is not configured for image generation. Add one at /app/admin/keys or set FAL_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "fal-ai/flux/dev";
    this.params = init.params || {};
  }

  async generate(req: ImageRequest): Promise<ImageResult> {
    const start = Date.now();
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      image_size: req.aspectRatio ?? "portrait_16_9",
      ...this.params,
    };
    if (req.referenceImageUrl) input.image_url = req.referenceImageUrl;

    // For image, use the sync endpoint (these are fast enough not to need queue).
    const res = await fetch(`https://fal.run/${this.model}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderError(`fal image ${res.status}: ${text.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: text,
      });
    }
    const data = (await res.json()) as { images?: { url: string; content_type?: string }[] };
    const img = data.images?.[0];
    if (!img?.url) throw new ProviderError("fal image returned no URL", { retryable: true });
    return {
      imageUrl: img.url,
      contentType: img.content_type,
      cost_usd: IMAGE_COST_ESTIMATE[this.model] ?? 0.03,
      latency_ms,
    };
  }
}

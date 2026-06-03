/**
 * Provider interfaces. The pipeline calls these — never a vendor SDK directly.
 *
 * Design rules:
 *   1. Inputs/outputs are plain JSON-serialisable values so Inngest can
 *      checkpoint them between steps without `toJSON()` shenanigans.
 *   2. Every result includes a `cost_usd` and `latency_ms` for the cost
 *      tracker + admin observability.
 *   3. Adapters never read process.env directly. The registry passes them
 *      `{ apiKey, model, params }` resolved from pipeline_config + provider_keys.
 *   4. Errors thrown from adapter calls should be `ProviderError` with
 *      `retryable: boolean` so the Inngest layer can distinguish a transient
 *      timeout (retry) from a content-policy block (don't retry, don't burn money).
 */

export type Cost = { cost_usd: number; latency_ms: number; tokens?: { input?: number; output?: number } };

export type ProviderInit = {
  /** Plaintext API key resolved by the registry (DB-encrypted or env). */
  apiKey: string | null;
  /** The model id the admin picked for this task. */
  model: string;
  /** Free-form params from pipeline_config.params (temperature, voice_id, etc.). */
  params: Record<string, unknown>;
};

export class ProviderError extends Error {
  retryable: boolean;
  status?: number;
  raw?: unknown;
  constructor(msg: string, opts: { retryable: boolean; status?: number; raw?: unknown }) {
    super(msg);
    this.name = "ProviderError";
    this.retryable = opts.retryable;
    this.status = opts.status;
    this.raw = opts.raw;
  }
}

/* ───────────────────────── LLM ───────────────────────── */

export type LLMRequest = {
  /** The full prompt as one or more turns. */
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  /** Optional retrieved context — empty in v1, populated by Phase-3 RAG. */
  context?: { text: string; source: string }[];
  /** Force JSON output (request-level, not model-level). */
  json?: boolean;
};

export type LLMResult = Cost & {
  text: string;
  /** When `json: true`, the parsed object. Adapters may return null on parse failure. */
  json?: unknown;
};

export interface LLMProvider {
  readonly name: string;          // 'anthropic' | 'google' | ...
  readonly model: string;
  complete(req: LLMRequest): Promise<LLMResult>;
}

/* ───────────────────────── Voice ─────────────────────── */

export type VoiceRequest = {
  text: string;
  voiceId?: string;                 // overrides params.voice_id
  /** Output format hint; adapters may pick the closest supported. */
  format?: "mp3" | "wav";
};

export type WordTiming = { word: string; start: number; end: number };

export type VoiceResult = Cost & {
  /**
   * Bytes of the audio file. Caller uploads to Storage; we keep the adapter
   * pure so it can be unit-tested without external services.
   */
  audio: Uint8Array;
  contentType: string;                  // 'audio/mpeg' | 'audio/wav'
  durationSeconds: number;
  wordTimings: WordTiming[];
};

export interface VoiceProvider {
  readonly name: string;
  readonly model: string;
  synthesize(req: VoiceRequest): Promise<VoiceResult>;
}

/* ───────────────────────── Image ─────────────────────── */

export type ImageRequest = {
  prompt: string;
  /** Presenter reference image (img2img / character consistency). */
  referenceImageUrl?: string;
  /** Provider-specific character id (e.g. Higgsfield trained character). */
  referenceCharacterId?: string;
  width?: number;
  height?: number;
  /** Aspect like "9:16"; adapters translate to provider-native param. */
  aspectRatio?: string;
};

export type ImageResult = Cost & {
  /** Hosted URL preferred (provider CDN). Adapter may also return bytes. */
  imageUrl?: string;
  imageBytes?: Uint8Array;
  contentType?: string;
};

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(req: ImageRequest): Promise<ImageResult>;
}

/* ───────────────────────── Video ─────────────────────── */

export type VideoRequest = {
  prompt: string;
  /** First-frame still (for image-to-video pipelines). */
  startImageUrl?: string;
  /** Audio file for lip-sync (URL). */
  voiceAudioUrl?: string;
  /** Trained character id where supported. */
  referenceCharacterId?: string;
  durationSeconds: number;
  aspectRatio?: string;
  /** Stable per-(shot_id, attempt) value for idempotency. */
  idempotencyKey?: string;
  /** When set, provider should call this URL when the job completes. */
  webhookUrl?: string;
};

export type VideoSubmitResult = { jobId: string; provider: string; model: string };

export type VideoJobStatus =
  | { status: "pending"; cost_usd: number }
  | { status: "running"; cost_usd: number; progress?: number }
  | { status: "done"; cost_usd: number; videoUrl: string; durationSeconds: number; latency_ms: number }
  | { status: "failed"; cost_usd: number; error: string; retryable: boolean };

export interface VideoProvider {
  readonly name: string;
  readonly model: string;
  /** Whether this provider supports webhook completion (skip polling if true). */
  readonly supportsWebhook: boolean;
  submit(req: VideoRequest): Promise<VideoSubmitResult>;
  poll(jobId: string): Promise<VideoJobStatus>;
  /** For webhook handlers — verify the signature, return the jobId + final status. */
  parseWebhook?(headers: Record<string, string>, body: string): Promise<{ jobId: string; status: VideoJobStatus }>;
}

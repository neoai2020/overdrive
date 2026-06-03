/**
 * Mock providers — realistic dummy outputs so the full pipeline runs end-to-end
 * without a single external API key. Default for fresh installs.
 *
 * Strategy:
 *   • LLM: pattern-match the task from the system prompt and return a
 *     plausible structured response (offer brief, hooks, scripts, shotlists).
 *   • Voice: returns a 1-byte placeholder + synthesized word timings (1 word
 *     per 0.35s).
 *   • Image / Video: returns placehold.co URLs / public-domain stock video.
 *
 * Outputs are deterministic enough to debug, varied enough to feel real.
 */

import {
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type VideoProvider,
  type VideoRequest,
  type VideoSubmitResult,
  type VideoJobStatus,
  type ProviderInit,
} from "./types";

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function deterministicJitter(seed: string, range: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % range;
}

/* ─── Mock LLM ─────────────────────────────────────────────────────────── */

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  readonly model: string;
  constructor(init: ProviderInit) {
    this.model = init.model || "mock-llm";
  }

  async complete(req: LLMRequest): Promise<LLMResult> {
    const start = Date.now();
    await delay(120 + deterministicJitter(JSON.stringify(req.messages), 300));

    const sys = (req.messages.find((m) => m.role === "system")?.content ?? "").toLowerCase();
    const userText = req.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

    let result: unknown;
    let text: string;

    if (sys.includes("understand the offer") || sys.includes("offer brief")) {
      result = mockOfferBrief(userText);
      text = JSON.stringify(result, null, 2);
    } else if (sys.includes("generate hooks") || sys.includes("hook candidates")) {
      result = mockHooks(userText);
      text = JSON.stringify(result, null, 2);
    } else if (sys.includes("score") && sys.includes("hooks")) {
      result = mockScoredHooks(userText);
      text = JSON.stringify(result, null, 2);
    } else if (sys.includes("write") && sys.includes("script")) {
      result = mockScript(userText);
      text = JSON.stringify(result, null, 2);
    } else if (sys.includes("shotlist")) {
      result = mockShotlist(userText);
      text = JSON.stringify(result, null, 2);
    } else {
      text = "Mock LLM response. Configure a real provider in /app/admin/models to enable production.";
      result = { text };
    }

    return {
      text,
      json: req.json ? result : undefined,
      cost_usd: 0,
      latency_ms: Date.now() - start,
      tokens: { input: Math.round(userText.length / 4), output: Math.round(text.length / 4) },
    };
  }
}

function mockOfferBrief(input: string) {
  return {
    product: "Glow24 Peptide Serum",
    promise: "Visibly smoother, plumper skin in 14 days — without retinol irritation.",
    avatar: {
      who: "Women 35-50, dealing with early signs of aging",
      pain: "Tried 6+ products, nothing has worked. Retinol burns. Worried about looking older.",
      desire: "Look like themselves at 30 again. Compliments from friends.",
    },
    painPoints: [
      "Retinol burns and peels",
      "Botox is expensive and scary",
      "Drugstore creams don't work",
    ],
    proof: "12-week clinical study, 92% reported visible firmness",
    price: "$69 for 30-day supply",
    angles: ["pain", "authority", "transformation", "pattern_interrupt"],
    raw_input_excerpt: input.slice(0, 200),
  };
}

function mockHooks(input: string) {
  const jitter = deterministicJitter(input, 100);
  return {
    hooks: [
      { text: "Why your moisturizer stopped working at 40 (it's not what you think).", style: "pattern_interrupt", score_hint: 0.92 + jitter * 0.0001 },
      { text: "Dermatologists hate this $69 peptide because it replaces $1,200 facials.", style: "authority", score_hint: 0.88 },
      { text: "I stopped buying creams when this one trick gave me my 30s skin back.", style: "story", score_hint: 0.86 },
      { text: "Stop wasting money on retinol — 92% of women see results in 14 days.", style: "proof", score_hint: 0.84 },
      { text: "The peptide every dermatologist uses on themselves (but doesn't recommend).", style: "curiosity", score_hint: 0.82 },
      { text: "If you're over 35 and your skin looks tired, watch this.", style: "callout", score_hint: 0.78 },
    ],
  };
}

function mockScoredHooks(input: string) {
  const { hooks } = mockHooks(input);
  return { hooks: hooks.slice(0, 3).map((h, i) => ({ ...h, rank: i + 1, score: h.score_hint })) };
}

function mockScript(input: string) {
  return {
    beats: [
      { kind: "hook", text: "Why your moisturizer stopped working at 40 — it's not what you think.", duration_hint: 4 },
      { kind: "pain", text: "I tried every serum on the shelf. My skin still felt tight by 3pm.", duration_hint: 6 },
      { kind: "reveal", text: "Then a derm friend told me about peptides — specifically, this one combo.", duration_hint: 5 },
      { kind: "proof", text: "Within two weeks, my fine lines softened. Three friends asked what I'd done.", duration_hint: 7 },
      { kind: "cta", text: "It's called Glow24. Link's below. Use code SOFT15 for 15% off.", duration_hint: 5 },
    ],
    estimated_length_seconds: 27,
    full_vo_text: "Why your moisturizer stopped working at 40 — it's not what you think. I tried every serum on the shelf. My skin still felt tight by 3pm. Then a derm friend told me about peptides — specifically, this one combo. Within two weeks, my fine lines softened. Three friends asked what I'd done. It's called Glow24. Link's below. Use code SOFT15 for 15% off.",
    input_excerpt: input.slice(0, 100),
  };
}

function mockShotlist(input: string) {
  return {
    shots: [
      { index: 0, type: "talking", vo_text: "Why your moisturizer stopped working at 40 — it's not what you think.", vo_start: 0,    vo_end: 4,    on_screen: "Watch this →" },
      { index: 1, type: "talking", vo_text: "I tried every serum on the shelf. My skin still felt tight by 3pm.",        vo_start: 4,    vo_end: 10,   on_screen: "Sound familiar?" },
      { index: 2, type: "talking", vo_text: "Then a derm friend told me about peptides — specifically, this one combo.", vo_start: 10,   vo_end: 15,   on_screen: "" },
      { index: 3, type: "talking", vo_text: "Within two weeks, my fine lines softened. Three friends asked what I'd done.", vo_start: 15, vo_end: 22, on_screen: "14 days" },
      { index: 4, type: "talking", vo_text: "It's called Glow24. Link's below. Use code SOFT15 for 15% off.",            vo_start: 22,   vo_end: 27,   on_screen: "SOFT15" },
    ],
    input_excerpt: input.slice(0, 100),
  };
}

/* ─── Mock Voice ───────────────────────────────────────────────────────── */

export class MockVoiceProvider implements VoiceProvider {
  readonly name = "mock";
  readonly model: string;
  constructor(init: ProviderInit) { this.model = init.model || "mock-voice"; }

  async synthesize(req: VoiceRequest): Promise<VoiceResult> {
    const start = Date.now();
    await delay(80);
    const words = req.text.split(/\s+/).filter(Boolean);
    const wordsPerSecond = 2.8;
    const wordTimings = words.map((word, i) => ({
      word,
      start: Number((i / wordsPerSecond).toFixed(3)),
      end: Number(((i + 1) / wordsPerSecond).toFixed(3)),
    }));
    return {
      audio: new Uint8Array([0x49, 0x44, 0x33]), // ID3 tag header — placeholder
      contentType: "audio/mpeg",
      durationSeconds: Number((words.length / wordsPerSecond).toFixed(2)),
      wordTimings,
      cost_usd: 0,
      latency_ms: Date.now() - start,
    };
  }
}

/* ─── Mock Image ───────────────────────────────────────────────────────── */

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly model: string;
  constructor(init: ProviderInit) { this.model = init.model || "mock-image"; }

  async generate(req: ImageRequest): Promise<ImageResult> {
    const start = Date.now();
    await delay(60);
    const seed = deterministicJitter(req.prompt, 999);
    const w = req.width ?? 1080;
    const h = req.height ?? 1920;
    return {
      imageUrl: `https://placehold.co/${w}x${h}/png?text=${encodeURIComponent(req.prompt.slice(0, 30))}+${seed}`,
      cost_usd: 0,
      latency_ms: Date.now() - start,
    };
  }
}

/* ─── Mock Video ───────────────────────────────────────────────────────── */

const MOCK_CLIP_URLS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
];

export class MockVideoProvider implements VideoProvider {
  readonly name = "mock";
  readonly model: string;
  readonly supportsWebhook = false;
  constructor(init: ProviderInit) { this.model = init.model || "mock-video"; }

  async submit(req: VideoRequest): Promise<VideoSubmitResult> {
    await delay(50);
    const jobId = `mock-${req.idempotencyKey ?? Math.random().toString(36).slice(2, 10)}`;
    return { jobId, provider: this.name, model: this.model };
  }

  async poll(jobId: string): Promise<VideoJobStatus> {
    await delay(20);
    const url = MOCK_CLIP_URLS[deterministicJitter(jobId, MOCK_CLIP_URLS.length)];
    return {
      status: "done",
      videoUrl: url,
      durationSeconds: 6,
      cost_usd: 0,
      latency_ms: 20,
    };
  }
}

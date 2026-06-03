/**
 * Google AI adapters (Gemini for text + nano-banana for image).
 * Direct HTTP — no SDK. Docs:
 *   https://ai.google.dev/api/rest
 *   https://ai.google.dev/gemini-api/docs/image-generation (nano-banana = gemini-2.5-flash-image)
 */

import {
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type ProviderInit,
  ProviderError,
} from "./types";

const PRICING: Record<string, { in: number; out: number }> = {
  "gemini-2.5-pro":   { in: 1.25, out: 5 },
  "gemini-2.5-flash": { in: 0.1, out: 0.4 },
};

/* ─── Gemini LLM ──────────────────────────────────────────────────────── */

export class GoogleLLMProvider implements LLMProvider {
  readonly name = "google";
  readonly model: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "Google AI API key is not configured. Add one at /app/admin/keys or set GOOGLE_API_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "gemini-2.5-pro";
    this.temperature = (init.params.temperature as number) ?? 0.7;
    this.maxTokens = (init.params.max_tokens as number) ?? 2048;
  }

  async complete(req: LLMRequest): Promise<LLMResult> {
    const start = Date.now();
    const sys = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contextBlock = (req.context ?? []).length > 0
      ? "\n\n<context>\n" + (req.context ?? []).map((c) => `[${c.source}] ${c.text}`).join("\n\n") + "\n</context>"
      : "";

    const contents = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    const body = {
      systemInstruction: sys + contextBlock ? { parts: [{ text: sys + contextBlock }] } : undefined,
      contents,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        ...(req.json ? { responseMimeType: "application/json" } : {}),
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Google ${res.status}: ${errText.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: errText,
      });
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const usage = data.usageMetadata ?? { promptTokenCount: 0, candidatesTokenCount: 0 };
    const pricing = PRICING[this.model] ?? { in: 0, out: 0 };
    const cost_usd =
      (usage.promptTokenCount / 1_000_000) * pricing.in +
      (usage.candidatesTokenCount / 1_000_000) * pricing.out;

    let json: unknown | undefined;
    if (req.json) {
      try { json = JSON.parse(text); } catch { json = null; }
    }
    return {
      text,
      json,
      cost_usd,
      latency_ms,
      tokens: { input: usage.promptTokenCount, output: usage.candidatesTokenCount },
    };
  }
}

/* ─── Google image (nano-banana via Gemini) ───────────────────────────── */

export class GoogleImageProvider implements ImageProvider {
  readonly name = "google";
  readonly model: string;
  private apiKey: string;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "Google AI API key is not configured for image generation. Add one at /app/admin/keys or set GOOGLE_API_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "gemini-2.5-flash-image";
  }

  async generate(req: ImageRequest): Promise<ImageResult> {
    const start = Date.now();
    // Gemini image generation: send prompt + (optional) reference image as
    // inline_data, model returns inline_data of generated image.
    const parts: ({ text: string } | { inline_data: { mime_type: string; data: string } })[] = [
      { text: req.prompt },
    ];
    if (req.referenceImageUrl) {
      const r = await fetch(req.referenceImageUrl);
      const buf = Buffer.from(await r.arrayBuffer());
      const mime = r.headers.get("content-type") || "image/png";
      parts.push({ inline_data: { mime_type: mime, data: buf.toString("base64") } });
    }

    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Google image ${res.status}: ${errText.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: errText,
      });
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inline_data?: { mime_type: string; data: string } }[] } }[];
    };
    const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inline_data)?.inline_data;
    if (!inline) {
      throw new ProviderError("Google image returned no image data.", { retryable: true });
    }
    return {
      imageBytes: Uint8Array.from(Buffer.from(inline.data, "base64")),
      contentType: inline.mime_type,
      cost_usd: 0.039, // $0.039 / image, approximate for gemini-2.5-flash-image
      latency_ms,
    };
  }
}

/**
 * Anthropic (Claude) LLM adapter.
 * Direct HTTP — no SDK — so we don't pull a heavy dep just for one call.
 * Docs: https://docs.anthropic.com/en/api/messages
 */

import {
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type ProviderInit,
  ProviderError,
} from "./types";

// Best-effort token pricing (input/output per 1M tokens, USD). Update via
// admin pipeline_config.params.pricing if these drift.
const DEFAULT_PRICING: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-opus-4-6":   { in: 15, out: 75 },
  "claude-haiku-4-6":  { in: 0.8, out: 4 },
};

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "Anthropic API key is not configured. Add one at /app/admin/keys or set ANTHROPIC_API_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "claude-sonnet-4-6";
    this.temperature = (init.params.temperature as number) ?? 0.7;
    this.maxTokens = (init.params.max_tokens as number) ?? 2048;
  }

  async complete(req: LLMRequest): Promise<LLMResult> {
    const start = Date.now();
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    // Context injection point — Phase-3 RAG drops in here.
    const contextBlock = (req.context ?? []).length > 0
      ? "\n\n<context>\n" + (req.context ?? []).map((c) => `[${c.source}] ${c.text}`).join("\n\n") + "\n</context>"
      : "";

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: system + contextBlock,
      messages,
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`Anthropic ${res.status}: ${errText.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: errText,
      });
    }

    const data = (await res.json()) as {
      content: { type: string; text: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
    const pricing = DEFAULT_PRICING[this.model] ?? { in: 0, out: 0 };
    const cost_usd =
      (data.usage.input_tokens / 1_000_000) * pricing.in +
      (data.usage.output_tokens / 1_000_000) * pricing.out;

    let json: unknown | undefined;
    if (req.json) {
      try {
        // Strip ```json fences if Claude wrapped them.
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        json = JSON.parse(cleaned);
      } catch { json = null; }
    }

    return {
      text,
      json,
      cost_usd,
      latency_ms,
      tokens: { input: data.usage.input_tokens, output: data.usage.output_tokens },
    };
  }
}

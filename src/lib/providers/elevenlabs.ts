/**
 * ElevenLabs TTS adapter with word-level timings (forced alignment is
 * built into the response when output_format includes timestamps).
 *
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 * The "with-timestamps" endpoint returns JSON `{ audio_base64, alignment }`.
 */

import {
  type VoiceProvider,
  type VoiceRequest,
  type VoiceResult,
  type WordTiming,
  type ProviderInit,
  ProviderError,
} from "./types";

// Approximate price: ~$0.30 / 1000 characters on creator-tier plans.
const COST_PER_1K_CHARS = 0.30;

export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly name = "elevenlabs";
  readonly model: string;
  private apiKey: string;
  private defaultVoiceId: string;

  constructor(init: ProviderInit) {
    if (!init.apiKey) {
      throw new ProviderError(
        "ElevenLabs API key is not configured. Add one at /app/admin/keys or set ELEVENLABS_API_KEY.",
        { retryable: false }
      );
    }
    this.apiKey = init.apiKey;
    this.model = init.model || "eleven_multilingual_v2";
    // Default voice — admin can override per task params, presenter can override per request.
    this.defaultVoiceId = (init.params.voice_id as string) || "21m00Tcm4TlvDq8ikWAM"; // 'Rachel'
  }

  async synthesize(req: VoiceRequest): Promise<VoiceResult> {
    const start = Date.now();
    const voiceId = req.voiceId || this.defaultVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        text: req.text,
        model_id: this.model,
        output_format: "mp3_44100_128",
      }),
    });
    const latency_ms = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      throw new ProviderError(`ElevenLabs ${res.status}: ${errText.slice(0, 400)}`, {
        retryable: res.status >= 500 || res.status === 429,
        status: res.status,
        raw: errText,
      });
    }

    const data = (await res.json()) as {
      audio_base64: string;
      alignment?: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      };
      normalized_alignment?: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      };
    };

    const audio = Uint8Array.from(Buffer.from(data.audio_base64, "base64"));
    const alignment = data.normalized_alignment ?? data.alignment;
    const wordTimings = alignment ? charsToWords(alignment) : synthesizeTimings(req.text);
    const durationSeconds = wordTimings.length > 0 ? wordTimings[wordTimings.length - 1].end : 0;
    const cost_usd = (req.text.length / 1000) * COST_PER_1K_CHARS;

    return {
      audio,
      contentType: "audio/mpeg",
      durationSeconds,
      wordTimings,
      cost_usd,
      latency_ms,
    };
  }
}

/** Group character alignment into word-level timings. */
function charsToWords(a: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }): WordTiming[] {
  const out: WordTiming[] = [];
  let word = "";
  let wordStart: number | null = null;
  let lastEnd = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    const start = a.character_start_times_seconds[i];
    const end = a.character_end_times_seconds[i];
    const isWordChar = /\S/.test(ch);
    if (isWordChar) {
      if (wordStart === null) wordStart = start;
      word += ch;
      lastEnd = end;
    } else if (word) {
      out.push({ word, start: wordStart ?? lastEnd, end: lastEnd });
      word = "";
      wordStart = null;
    }
  }
  if (word) out.push({ word, start: wordStart ?? lastEnd, end: lastEnd });
  return out;
}

/** Fallback when alignment is missing — fake even spacing. */
function synthesizeTimings(text: string): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  const wps = 2.8;
  return words.map((word, i) => ({
    word,
    start: Number((i / wps).toFixed(3)),
    end: Number(((i + 1) / wps).toFixed(3)),
  }));
}

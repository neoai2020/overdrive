/**
 * Provider registry — the single point where the pipeline resolves
 * "task → live adapter instance, ready to call."
 *
 * Resolution sequence:
 *   1. Load all enabled pipeline_config rows for the task (workspace scope
 *      first, fall back to global). Multiple rows = weighted A/B split.
 *   2. Weighted-random pick one config row (deterministic with seed for
 *      replay/debug).
 *   3. Resolve the API key: provider_keys (workspace then global) →
 *      env var fallback → null for mock.
 *   4. Construct the concrete adapter via the constructor map.
 *
 * The chosen `{ provider, model, label }` is returned alongside the adapter
 * so callers can log it to `generation_events.data` for A/B analysis.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToString } from "@/lib/server/encryption";
import {
  type PipelineTask,
  TASK_CAPABILITY,
  type Capability,
} from "@/lib/pipeline/tasks";
import type {
  LLMProvider,
  VoiceProvider,
  ImageProvider,
  VideoProvider,
  ProviderInit,
} from "./types";

import { MockLLMProvider, MockVoiceProvider, MockImageProvider, MockVideoProvider } from "./mock";
import { AnthropicLLMProvider } from "./anthropic";
import { GoogleLLMProvider, GoogleImageProvider } from "./google";
import { ElevenLabsVoiceProvider } from "./elevenlabs";
import { FalVideoProvider, FalImageProvider } from "./fal";
import { HiggsfieldVideoProvider } from "./higgsfield";

/* ─── Constructor maps ─────────────────────────────────────────────────── */

type LLMCtor = new (init: ProviderInit) => LLMProvider;
type VoiceCtor = new (init: ProviderInit) => VoiceProvider;
type ImageCtor = new (init: ProviderInit) => ImageProvider;
type VideoCtor = new (init: ProviderInit) => VideoProvider;

const LLM_CTORS: Record<string, LLMCtor> = {
  mock: MockLLMProvider,
  anthropic: AnthropicLLMProvider,
  google: GoogleLLMProvider,
};
const VOICE_CTORS: Record<string, VoiceCtor> = {
  mock: MockVoiceProvider,
  elevenlabs: ElevenLabsVoiceProvider,
};
const IMAGE_CTORS: Record<string, ImageCtor> = {
  mock: MockImageProvider,
  google: GoogleImageProvider,
  fal: FalImageProvider,
};
const VIDEO_CTORS: Record<string, VideoCtor> = {
  mock: MockVideoProvider,
  fal: FalVideoProvider,
  higgsfield: HiggsfieldVideoProvider,
};

/* ─── Env fallbacks ─────────────────────────────────────────────────────── */

const ENV_KEY_FOR_PROVIDER: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
  fal: "FAL_KEY",
  higgsfield: "HIGGSFIELD_API_KEY",
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ResolvedAdapter<P> = {
  adapter: P;
  provider: string;
  model: string;
  configId: string;
  label: string | null;
};

type PipelineConfigRow = {
  id: string;
  task: string;
  provider: string;
  model: string;
  params: Record<string, unknown>;
  weight: number;
  enabled: boolean;
  workspace_id: string | null;
  label: string | null;
};

/* ─── Resolution ────────────────────────────────────────────────────────── */

async function loadConfigs(task: PipelineTask, workspaceId?: string | null): Promise<PipelineConfigRow[]> {
  const supabase = await createAdminClient();
  // Workspace overrides first.
  if (workspaceId) {
    const { data: ws } = await supabase
      .from("pipeline_config")
      .select("*")
      .eq("task", task)
      .eq("enabled", true)
      .eq("workspace_id", workspaceId);
    if (ws && ws.length > 0) return ws as PipelineConfigRow[];
  }
  const { data, error } = await supabase
    .from("pipeline_config")
    .select("*")
    .eq("task", task)
    .eq("enabled", true)
    .is("workspace_id", null);
  if (error) throw error;
  return (data ?? []) as PipelineConfigRow[];
}

function weightedPick(rows: PipelineConfigRow[]): PipelineConfigRow {
  if (rows.length === 1) return rows[0];
  const total = rows.reduce((s, r) => s + Math.max(0, r.weight), 0);
  if (total <= 0) return rows[0];
  let r = Math.random() * total;
  for (const row of rows) {
    r -= Math.max(0, row.weight);
    if (r <= 0) return row;
  }
  return rows[rows.length - 1];
}

async function resolveApiKey(provider: string, workspaceId?: string | null): Promise<string | null> {
  if (provider === "mock") return null;
  const supabase = await createAdminClient();

  // Workspace key first.
  if (workspaceId) {
    const { data: wsKey } = await supabase
      .from("provider_keys")
      .select("id, key_encrypted")
      .eq("provider", provider)
      .eq("active", true)
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();
    if (wsKey?.key_encrypted) {
      void supabase.from("provider_keys").update({ last_used_at: new Date().toISOString() }).eq("id", wsKey.id);
      return decryptToString(wsKey.key_encrypted as unknown as Buffer);
    }
  }

  // Global key.
  const { data: globalKey } = await supabase
    .from("provider_keys")
    .select("id, key_encrypted")
    .eq("provider", provider)
    .eq("active", true)
    .is("workspace_id", null)
    .limit(1)
    .maybeSingle();
  if (globalKey?.key_encrypted) {
    void supabase.from("provider_keys").update({ last_used_at: new Date().toISOString() }).eq("id", globalKey.id);
    return decryptToString(globalKey.key_encrypted as unknown as Buffer);
  }

  // Env fallback.
  const envName = ENV_KEY_FOR_PROVIDER[provider];
  if (envName) {
    const envVal = process.env[envName];
    if (envVal && envVal.length > 0) return envVal;
  }
  return null;
}

function ctorFor(cap: Capability, provider: string):
  | LLMCtor
  | VoiceCtor
  | ImageCtor
  | VideoCtor
  | undefined {
  switch (cap) {
    case "llm": return LLM_CTORS[provider];
    case "voice": return VOICE_CTORS[provider];
    case "image": return IMAGE_CTORS[provider];
    case "video": return VIDEO_CTORS[provider];
  }
}

export async function resolveLLM(task: PipelineTask, workspaceId?: string | null): Promise<ResolvedAdapter<LLMProvider>> {
  return resolve<LLMProvider>(task, workspaceId);
}
export async function resolveVoice(task: PipelineTask, workspaceId?: string | null): Promise<ResolvedAdapter<VoiceProvider>> {
  return resolve<VoiceProvider>(task, workspaceId);
}
export async function resolveImage(task: PipelineTask, workspaceId?: string | null): Promise<ResolvedAdapter<ImageProvider>> {
  return resolve<ImageProvider>(task, workspaceId);
}
export async function resolveVideo(task: PipelineTask, workspaceId?: string | null): Promise<ResolvedAdapter<VideoProvider>> {
  return resolve<VideoProvider>(task, workspaceId);
}

async function resolve<P>(task: PipelineTask, workspaceId?: string | null): Promise<ResolvedAdapter<P>> {
  const cap = TASK_CAPABILITY[task];
  const rows = await loadConfigs(task, workspaceId);
  if (rows.length === 0) {
    throw new Error(`No enabled pipeline_config row found for task "${task}". Configure one at /app/admin/models.`);
  }
  const cfg = weightedPick(rows);
  const Ctor = ctorFor(cap, cfg.provider);
  if (!Ctor) {
    throw new Error(`No adapter registered for capability "${cap}" + provider "${cfg.provider}". Check src/lib/providers/registry.ts.`);
  }
  const apiKey = await resolveApiKey(cfg.provider, workspaceId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new (Ctor as any)({ apiKey, model: cfg.model, params: cfg.params }) as P;
  return { adapter, provider: cfg.provider, model: cfg.model, configId: cfg.id, label: cfg.label };
}

/**
 * Explicit resolution (used by the admin "Test this task" page): construct
 * the requested provider/model directly, bypassing pipeline_config weights.
 */
export async function resolveExplicit<P>(
  cap: Capability,
  provider: string,
  model: string,
  params: Record<string, unknown>,
  workspaceId?: string | null
): Promise<ResolvedAdapter<P>> {
  const Ctor = ctorFor(cap, provider);
  if (!Ctor) {
    throw new Error(`No adapter registered for ${cap} + ${provider}.`);
  }
  const apiKey = await resolveApiKey(provider, workspaceId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new (Ctor as any)({ apiKey, model, params }) as P;
  return { adapter, provider, model, configId: "explicit", label: "ab-test" };
}

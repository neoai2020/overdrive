/**
 * Pipeline tasks — the unit the admin model-switcher operates on.
 *
 * Adding a task is intentionally cheap: drop a string here, then read it
 * from pipeline_config in the relevant Inngest step. No DB migration.
 *
 * Each task has a "capability" — which provider INTERFACE it requires.
 * The registry uses this to pick the right adapter constructor.
 */

export const PIPELINE_TASKS = [
  "understand_offer",
  "generate_hooks",
  "score_hooks",
  "write_script",
  "build_shotlist",
  "voiceover",
  "image",
  "video",
] as const;

export type PipelineTask = (typeof PIPELINE_TASKS)[number];

export type Capability = "llm" | "voice" | "image" | "video";

export const TASK_CAPABILITY: Record<PipelineTask, Capability> = {
  understand_offer: "llm",
  generate_hooks: "llm",
  score_hooks: "llm",
  write_script: "llm",
  build_shotlist: "llm",
  voiceover: "voice",
  image: "image",
  video: "video",
};

/**
 * Human-readable task labels for the admin UI.
 */
export const TASK_LABEL: Record<PipelineTask, string> = {
  understand_offer: "Understand offer",
  generate_hooks: "Generate hooks",
  score_hooks: "Score hooks",
  write_script: "Write script",
  build_shotlist: "Build shotlist",
  voiceover: "Voiceover (TTS)",
  image: "Image generation (per-shot still)",
  video: "Video generation (per-shot clip)",
};

/**
 * Providers we know how to instantiate. Used by the admin UI to populate
 * the provider dropdown for each task. Keeping this hardcoded means a
 * misconfigured `pipeline_config` row can't pick a provider with no adapter.
 */
export const PROVIDERS_BY_CAPABILITY: Record<Capability, readonly string[]> = {
  llm: ["mock", "anthropic", "google", "openai"],
  voice: ["mock", "elevenlabs"],
  image: ["mock", "google", "fal"],
  video: ["mock", "fal", "higgsfield"],
};

/**
 * Curated model lists per provider (NOT the full catalogue — these are the
 * ones we actually expose to admins). Admin can still type a custom model
 * id; we don't enforce the list at the DB level.
 */
export const MODELS_BY_PROVIDER: Record<string, readonly string[]> = {
  // LLM
  "anthropic": ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-6"],
  "google": ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-image"], // flash-image = nano-banana
  "openai": ["gpt-5.5", "gpt-5.1-mini"],

  // Voice
  "elevenlabs": ["eleven_multilingual_v2", "eleven_turbo_v2_5"],

  // Image
  "fal-image": ["fal-ai/flux/dev", "fal-ai/flux-pro/v1.1"],

  // Video — fal aggregator exposes many; these are the ones we care about for UGC
  "fal": [
    "fal-ai/kling-video/v2.5/pro/image-to-video",
    "fal-ai/kling-video/v2.5/pro/text-to-video",
    "fal-ai/veo3/fast/image-to-video",
    "fal-ai/sora-2/text-to-video",
    "fal-ai/hunyuan-video/image-to-video",
    "fal-ai/flux/dev",                            // when this provider is used for image task
    "fal-ai/flux-pro/v1.1",
  ],
  "higgsfield": ["soul-character-v1", "soul-character-v1-lipsync"],

  // Mock (always available, returns canned responses)
  "mock": ["mock-llm", "mock-voice", "mock-image", "mock-video"],
};

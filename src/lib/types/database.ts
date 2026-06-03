/**
 * Minimal hand-written Supabase Database type, sufficient for typed queries
 * across the app. Once the Supabase project is live we'll replace this with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CampaignObjective = "conversions" | "leads" | "traffic" | "engagement";
export type CampaignBudgetType = "cbo" | "abo";
export type CampaignBidStrategy = "highest_volume" | "cost_cap" | "roas_goal";
export type CampaignStatus = "draft" | "generating" | "review" | "live" | "paused" | "archived";

export type AdSetAudienceType = "advantage_plus" | "lookalike" | "interests" | "custom";
export type AdSetPlacementMode = "advantage_plus" | "manual";
export type AdSetStatus = CampaignStatus;

export type AdStyle = "ugc_talking_head" | "b_roll_vo" | "testimonial" | "before_after" | "pattern_interrupt";
export type AdStatus = "queued" | "generating" | "needs_review" | "ready" | "failed" | "archived";

export type PlacementStatus = "staged" | "pushed" | "failed" | "paused";

export type BatchStatus = "queued" | "generating" | "needs_review" | "ready" | "partial" | "failed" | "cancelled";
export type BatchRunMode = "autopilot" | "review_checkpoints";

export type TemplateKind = "ugc_story" | "ugc_authority" | "ugc_pattern_interrupt" | "b_roll_listicle" | "b_roll_transform";
export type VoiceFileKind = "swipe" | "script" | "brand_voice" | "transcript" | "other";

export type IntegrationProvider = "meta" | "tiktok";
export type IntegrationStatus = "connected" | "disconnected" | "token_expired" | "error";

export type JobKind = "generate_batch" | "analyze_offer" | "push_to_meta" | "refresh_meta_metrics" | "extract_voice_file";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface Workspace {
  id: string; name: string; slug: string;
  plan: "free" | "starter" | "scale" | "enterprise";
  credits_used: number; credits_total: number;
  created_at: string; updated_at: string;
}

export interface Profile {
  id: string; workspace_id: string;
  full_name: string | null; avatar_url: string | null;
  role: "owner" | "admin" | "member";
  created_at: string; updated_at: string;
}

export interface Offer {
  id: string; workspace_id: string;
  name: string; niche: string | null; url: string | null; thumbnail_url: string | null;
  price_text: string | null; promise: string | null; proof: string | null;
  avatar: Json | null; angles: Json; objections: Json; competitors: Json;
  last_researched_at: string | null;
  created_at: string; updated_at: string;
}

export interface Campaign {
  id: string; workspace_id: string; offer_id: string | null;
  name: string; objective: CampaignObjective;
  budget_type: CampaignBudgetType; daily_budget: number;
  bid_strategy: CampaignBidStrategy;
  integration_id: string | null; meta_account_id: string | null;
  status: CampaignStatus; meta_campaign_id: string | null; pushed_at: string | null;
  spend: number | null; roas: number | null;
  created_at: string; updated_at: string;
}

export interface AdSet {
  id: string; workspace_id: string; campaign_id: string;
  name: string; locations: string[]; age_min: number; age_max: number;
  audience_type: AdSetAudienceType; audience_config: Json | null;
  placement_mode: AdSetPlacementMode; placements: string[] | null;
  daily_budget: number | null; status: AdSetStatus;
  meta_adset_id: string | null; pushed_at: string | null;
  spend: number | null; roas: number | null;
  created_at: string; updated_at: string;
}

export interface Ad {
  id: string; workspace_id: string; offer_id: string | null;
  batch_id: string | null; current_version_id: string | null;
  name: string | null; status: AdStatus;
  created_at: string; updated_at: string;
}

export interface AdVersion {
  id: string; ad_id: string; version_number: number;
  hook: string | null; script: string | null; style: AdStyle | null; length_seconds: number | null;
  video_url: string | null; thumbnail_url: string | null; caption: string | null;
  voice_id: string | null; talent_id: string | null; metadata: Json;
  created_at: string;
}

export interface AdPlacement {
  id: string; workspace_id: string; ad_id: string; ad_set_id: string;
  status: PlacementStatus; meta_ad_id: string | null; pushed_at: string | null;
  spend: number | null; roas: number | null;
  created_at: string;
}

export interface Batch {
  id: string; workspace_id: string; offer_id: string | null; scoped_ad_set_id: string | null;
  angle: string | null; custom_angle: string | null;
  style_mix: string[]; size: number; run_mode: BatchRunMode;
  status: BatchStatus; progress_step: string | null; progress_pct: number | null;
  idempotency_key: string | null; preset_id: string | null; template_id: string | null;
  credits_spent: number | null;
  created_by: string | null; created_at: string; completed_at: string | null;
  metadata: Json;
}

export interface Template {
  id: string; workspace_id: string | null; is_system: boolean;
  kind: TemplateKind | null; name: string; summary: string | null;
  structure: Json; default_length: number | null; niches: string[] | null;
  usage_count: number; created_at: string;
}

export interface Preset {
  id: string; workspace_id: string; name: string; description: string | null;
  config: Json; usage_count: number; created_at: string;
}

export interface VoiceFile {
  id: string; workspace_id: string; kind: VoiceFileKind;
  name: string; storage_path: string; mime_type: string | null; size_bytes: number | null;
  niches: string[] | null; notes: string | null; extracted_text: string | null;
  uploaded_by: string | null; created_at: string;
}

export interface Integration {
  id: string; workspace_id: string; provider: IntegrationProvider; status: IntegrationStatus;
  display_name: string | null; config: Json;
  access_token: string | null; refresh_token: string | null; token_expires_at: string | null;
  connected_at: string; last_used_at: string | null;
}

export interface JobRow {
  id: string; workspace_id: string; kind: JobKind; status: JobStatus;
  subject_table: string | null; subject_id: string | null;
  payload: Json; result: Json; error: string | null;
  progress_step: string | null; progress_pct: number | null;
  attempts: number; max_attempts: number; idempotency_key: string | null;
  created_by: string | null; created_at: string;
  started_at: string | null; completed_at: string | null; next_attempt_at: string | null;
}

export interface CreditLedgerRow {
  id: string; workspace_id: string; delta: number; reason: string;
  related_table: string | null; related_id: string | null;
  metadata: Json; created_by: string | null; created_at: string;
}

export interface WorkspaceSettings {
  workspace_id: string;
  autopilot_default: boolean; default_batch_size: number;
  default_style_mix: string[]; default_run_mode: BatchRunMode;
  notification_email: string | null; updated_at: string;
}

// ---------------------------------------------------------------------------
// Database<T> — minimal generated-style shape so supabase-js .insert/.select/.update
// don't return `never`. Replace with `npx supabase gen types typescript`
// once your project ref is set.
//
// We intentionally use `Record<string, unknown>` for the Insert/Update shapes
// (rather than `Partial<Row>`) — Supabase-js's runtime accepts any shape and
// the strict overload was producing too many false-positive type errors with
// our hand-written types. Reads (Row, Returns) stay strongly-typed.
// ---------------------------------------------------------------------------

type TableShape<Row> = {
  Row: Row;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  __InternalSupabase: { PostgrestVersion: "12.2.3" };
  public: {
    Tables: {
      workspaces:         TableShape<Workspace>;
      profiles:           TableShape<Profile>;
      offers:             TableShape<Offer>;
      campaigns:          TableShape<Campaign>;
      ad_sets:            TableShape<AdSet>;
      ads:                TableShape<Ad>;
      ad_versions:        TableShape<AdVersion>;
      ad_placements:      TableShape<AdPlacement>;
      batches:            TableShape<Batch>;
      templates:          TableShape<Template>;
      presets:            TableShape<Preset>;
      voice_files:        TableShape<VoiceFile>;
      integrations:       TableShape<Integration>;
      jobs:               TableShape<JobRow>;
      credit_ledger:      TableShape<CreditLedgerRow>;
      workspace_settings: TableShape<WorkspaceSettings>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

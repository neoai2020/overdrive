-- ============================================================================
-- Overdrive: Initial schema
-- Mental model: Workspace → Offer → Campaign → Ad Set → Ad
-- Key decisions (vs the brief — see README for rationale):
--   • Ads ↔ Ad Sets is many-to-many via ad_placements
--   • Ads have immutable ad_versions; ad.current_version_id points at the live one
--   • Batches own the generated ads; assignment to ad sets is separate
--   • Generic jobs + webhook_events tables for async pipelines (Phase 2 swap-in)
--   • Credit ledger tracks per-step cost from day one
--   • Research output is appended to the Offer record (not a separate "brief" entity)
-- ============================================================================

-- Helpful extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- WORKSPACES & USERS
-- ============================================================================

create table public.workspaces (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  plan          text not null default 'free' check (plan in ('free','starter','scale','enterprise')),
  credits_used  integer not null default 0,
  credits_total integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Profiles extend Supabase auth.users with workspace context.
-- Each user belongs to exactly one workspace in Phase 1 (team support = Phase 2).
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  role          text not null default 'owner' check (role in ('owner','admin','member')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_workspace_idx on public.profiles(workspace_id);

-- ============================================================================
-- OFFERS — a product the user promotes (reusable across campaigns)
-- Research output is stored here directly: avatar, angles, objections.
-- ============================================================================

create table public.offers (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  niche         text,                              -- 'weight_loss', 'forex', 'biz_opp', 'crypto', 'peptides', 'skincare'
  url           text,                              -- the offer/sales page link
  thumbnail_url text,
  price_text    text,                              -- "$69 · VSL"
  promise       text,                              -- "Burn fat while you sleep"
  proof         text,                              -- "Before/after"
  avatar        jsonb,                             -- structured buyer avatar
  angles        jsonb default '[]'::jsonb,         -- [{ name, summary, confidence, ... }]
  objections    jsonb default '[]'::jsonb,
  competitors   jsonb default '[]'::jsonb,
  last_researched_at timestamptz,                  -- when Research last refreshed this
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index offers_workspace_idx on public.offers(workspace_id);
create index offers_niche_idx on public.offers(niche);

-- ============================================================================
-- CAMPAIGNS — Meta-style campaign settings
-- ============================================================================

create type campaign_objective as enum ('conversions', 'leads', 'traffic', 'engagement');
create type campaign_budget_type as enum ('cbo', 'abo');
create type campaign_bid_strategy as enum ('highest_volume', 'cost_cap', 'roas_goal');
create type campaign_status as enum ('draft', 'generating', 'review', 'live', 'paused', 'archived');

create table public.campaigns (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  offer_id        uuid references public.offers(id) on delete set null,
  name            text not null,
  objective       campaign_objective not null default 'conversions',
  budget_type     campaign_budget_type not null default 'cbo',
  daily_budget    numeric(10,2) not null default 100,
  bid_strategy    campaign_bid_strategy not null default 'highest_volume',
  integration_id  uuid,                                       -- FK added below after integrations table
  meta_account_id text,                                       -- the act_xxxxx
  status          campaign_status not null default 'draft',
  meta_campaign_id text,                                      -- once pushed, the real Meta ID
  pushed_at       timestamptz,
  -- Performance (Phase 2 syncs from Meta; null for now):
  spend           numeric(12,2),
  roas            numeric(6,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index campaigns_workspace_idx on public.campaigns(workspace_id);
create index campaigns_offer_idx on public.campaigns(offer_id);
create index campaigns_status_idx on public.campaigns(status);

-- ============================================================================
-- AD SETS — targeting unit inside a campaign
-- ============================================================================

create type adset_audience_type as enum ('advantage_plus', 'lookalike', 'interests', 'custom');
create type adset_placement_mode as enum ('advantage_plus', 'manual');
create type adset_status as enum ('draft', 'generating', 'review', 'live', 'paused', 'archived');

create table public.ad_sets (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  name            text not null,
  locations       text[] default '{"United States"}',
  age_min         integer not null default 25,
  age_max         integer not null default 55,
  audience_type   adset_audience_type not null default 'advantage_plus',
  audience_config jsonb,                                  -- lookalike sources, interest list, custom audience id, etc.
  placement_mode  adset_placement_mode not null default 'advantage_plus',
  placements      text[],                                 -- manual placements list when placement_mode='manual'
  daily_budget    numeric(10,2),                          -- null for CBO campaigns
  status          adset_status not null default 'draft',
  meta_adset_id   text,
  pushed_at       timestamptz,
  spend           numeric(12,2),
  roas            numeric(6,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index ad_sets_workspace_idx on public.ad_sets(workspace_id);
create index ad_sets_campaign_idx on public.ad_sets(campaign_id);

-- ============================================================================
-- ADS + AD VERSIONS + AD PLACEMENTS (the three-table creative model)
-- ============================================================================

create type ad_style as enum ('ugc_talking_head', 'b_roll_vo', 'testimonial', 'before_after', 'pattern_interrupt');
create type ad_status as enum ('queued', 'generating', 'needs_review', 'ready', 'failed', 'archived');

-- The "creative identity" — stable across regenerations
create table public.ads (
  id                   uuid primary key default uuid_generate_v4(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  offer_id             uuid references public.offers(id) on delete set null,
  batch_id             uuid,                                   -- FK added below after batches
  current_version_id   uuid,                                   -- FK added below (chicken/egg)
  name                 text,
  status               ad_status not null default 'queued',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index ads_workspace_idx on public.ads(workspace_id);
create index ads_offer_idx on public.ads(offer_id);
create index ads_batch_idx on public.ads(batch_id);
create index ads_status_idx on public.ads(status);

-- Immutable snapshot of a generated/regenerated creative
create table public.ad_versions (
  id              uuid primary key default uuid_generate_v4(),
  ad_id           uuid not null references public.ads(id) on delete cascade,
  version_number  integer not null default 1,
  hook            text,                                     -- the opening line/hook
  script          text,                                     -- the full script
  style           ad_style,
  length_seconds  integer,
  video_url       text,                                     -- finished MP4 (Phase 2 fills)
  thumbnail_url   text,
  caption         text,                                     -- burned-in caption text
  voice_id        text,                                     -- which voice was used
  talent_id       text,                                     -- which UGC talent
  metadata        jsonb default '{}'::jsonb,                -- engine-internal (Phase 2: prompts, model versions, etc.)
  created_at      timestamptz not null default now(),
  unique (ad_id, version_number)
);
create index ad_versions_ad_idx on public.ad_versions(ad_id);

alter table public.ads
  add constraint ads_current_version_fk
  foreign key (current_version_id) references public.ad_versions(id) on delete set null;

-- M:N — an ad can live in multiple ad sets (same creative across audiences)
create type placement_status as enum ('staged', 'pushed', 'failed', 'paused');

create table public.ad_placements (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  ad_id           uuid not null references public.ads(id) on delete cascade,
  ad_set_id       uuid not null references public.ad_sets(id) on delete cascade,
  status          placement_status not null default 'staged',
  meta_ad_id      text,                                     -- once pushed to Meta
  pushed_at       timestamptz,
  spend           numeric(12,2),
  roas            numeric(6,2),
  created_at      timestamptz not null default now(),
  unique (ad_id, ad_set_id)
);
create index ad_placements_workspace_idx on public.ad_placements(workspace_id);
create index ad_placements_ad_idx on public.ad_placements(ad_id);
create index ad_placements_adset_idx on public.ad_placements(ad_set_id);

-- ============================================================================
-- BATCHES — one run of the wizard producing N ads
-- ============================================================================

create type batch_status as enum ('queued', 'generating', 'needs_review', 'ready', 'partial', 'failed', 'cancelled');
create type batch_run_mode as enum ('autopilot', 'review_checkpoints');

create table public.batches (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  offer_id        uuid references public.offers(id) on delete set null,
  -- Optional scoping: batches CAN be tied to an ad set, but ad assignment is via ad_placements
  scoped_ad_set_id uuid references public.ad_sets(id) on delete set null,
  angle           text,
  custom_angle    text,
  style_mix       text[] not null default '{ugc_talking_head}',
  size            integer not null default 10,
  run_mode        batch_run_mode not null default 'autopilot',
  status          batch_status not null default 'queued',
  progress_step   text,                                     -- 'reading', 'hooks', 'scripting', 'talent', 'editing', 'done'
  progress_pct    integer default 0,
  idempotency_key text unique,                              -- prevents double-charge on double-click
  preset_id       uuid,                                     -- FK added below
  template_id     uuid,                                     -- FK added below
  credits_spent   integer default 0,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  metadata        jsonb default '{}'::jsonb
);
create index batches_workspace_idx on public.batches(workspace_id);
create index batches_offer_idx on public.batches(offer_id);
create index batches_status_idx on public.batches(status);

alter table public.ads
  add constraint ads_batch_fk
  foreign key (batch_id) references public.batches(id) on delete set null;

-- ============================================================================
-- TEMPLATES (ad structures) + PRESETS (saved wizard configs)
-- Two distinct concepts, two tables.
-- ============================================================================

create type template_kind as enum ('ugc_story', 'ugc_authority', 'ugc_pattern_interrupt', 'b_roll_listicle', 'b_roll_transform');

create table public.templates (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references public.workspaces(id) on delete cascade,    -- null = global template
  is_system       boolean not null default false,
  kind            template_kind,
  name            text not null,
  summary         text,
  structure       jsonb not null default '[]'::jsonb,                          -- ordered list of beats
  default_length  integer,                                                     -- seconds
  niches          text[],
  usage_count     integer not null default 0,
  created_at      timestamptz not null default now()
);
create index templates_workspace_idx on public.templates(workspace_id);

create table public.presets (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  name            text not null,
  description     text,
  config          jsonb not null,                                              -- angle, style_mix, size, run_mode, etc.
  usage_count     integer not null default 0,
  created_at      timestamptz not null default now()
);
create index presets_workspace_idx on public.presets(workspace_id);

alter table public.batches add constraint batches_preset_fk
  foreign key (preset_id) references public.presets(id) on delete set null;
alter table public.batches add constraint batches_template_fk
  foreign key (template_id) references public.templates(id) on delete set null;

-- ============================================================================
-- "MY VOICE" KNOWLEDGE BASE — uploaded swipe files, scripts, brand voice
-- ============================================================================

create type voice_file_kind as enum ('swipe', 'script', 'brand_voice', 'transcript', 'other');

create table public.voice_files (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  kind            voice_file_kind not null default 'other',
  name            text not null,
  storage_path    text not null,                                               -- Supabase Storage object key
  mime_type       text,
  size_bytes      bigint,
  niches          text[],
  notes           text,
  extracted_text  text,                                                        -- Phase 2: parsed content for retrieval
  uploaded_by     uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index voice_files_workspace_idx on public.voice_files(workspace_id);

-- ============================================================================
-- INTEGRATIONS — connected ad accounts (Meta first, TikTok later)
-- ============================================================================

create type integration_provider as enum ('meta', 'tiktok');
create type integration_status as enum ('connected', 'disconnected', 'token_expired', 'error');

create table public.integrations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  provider        integration_provider not null,
  status          integration_status not null default 'connected',
  display_name    text,
  -- Nested provider-specific data (ad_account_id, pixel_id, business_id, page_id, ig_account_id, etc.)
  config          jsonb not null default '{}'::jsonb,
  access_token    text,                                                        -- stored encrypted-at-rest (Supabase Vault recommended)
  refresh_token   text,
  token_expires_at timestamptz,
  connected_at    timestamptz not null default now(),
  last_used_at    timestamptz
);
create index integrations_workspace_idx on public.integrations(workspace_id);
create index integrations_provider_idx on public.integrations(provider);

alter table public.campaigns add constraint campaigns_integration_fk
  foreign key (integration_id) references public.integrations(id) on delete set null;

-- ============================================================================
-- JOBS — generic async job runner (Phase 2 swap point)
-- Every long-running operation (generate batch, push to Meta, analyze offer) creates a job.
-- ============================================================================

create type job_kind as enum ('generate_batch', 'analyze_offer', 'push_to_meta', 'refresh_meta_metrics', 'extract_voice_file');
create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create table public.jobs (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  kind            job_kind not null,
  status          job_status not null default 'queued',
  -- What this job is about (any of these may be null based on kind):
  subject_table   text,                                                        -- 'batches' | 'campaigns' | 'offers' | etc.
  subject_id      uuid,
  payload         jsonb default '{}'::jsonb,
  result          jsonb default '{}'::jsonb,
  error           text,
  progress_step   text,
  progress_pct    integer default 0,
  attempts        integer not null default 0,
  max_attempts    integer not null default 3,
  idempotency_key text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  next_attempt_at timestamptz
);
create index jobs_workspace_idx on public.jobs(workspace_id);
create index jobs_status_idx on public.jobs(status);
create index jobs_kind_idx on public.jobs(kind);
create index jobs_subject_idx on public.jobs(subject_table, subject_id);
create unique index jobs_idempotency_key_idx on public.jobs(workspace_id, idempotency_key) where idempotency_key is not null;

-- ============================================================================
-- WEBHOOK EVENTS — durable inbox for provider callbacks (Meta leadgen, etc.)
-- ============================================================================

create table public.webhook_events (
  id              uuid primary key default uuid_generate_v4(),
  provider        text not null,
  event_type      text not null,
  payload         jsonb not null,
  signature       text,
  processed_at    timestamptz,
  error           text,
  received_at     timestamptz not null default now()
);
create index webhook_events_provider_idx on public.webhook_events(provider, event_type);
create index webhook_events_unprocessed_idx on public.webhook_events(received_at) where processed_at is null;

-- ============================================================================
-- CREDIT LEDGER — every charge with per-step breakdown
-- ============================================================================

create table public.credit_ledger (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  delta           integer not null,                                            -- negative = spend, positive = grant/refund
  reason          text not null,                                               -- 'batch.hooks', 'batch.voice', 'batch.video', 'plan.refill', 'admin.grant'
  related_table   text,
  related_id      uuid,
  metadata        jsonb default '{}'::jsonb,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index credit_ledger_workspace_idx on public.credit_ledger(workspace_id, created_at desc);

-- ============================================================================
-- WORKSPACE SETTINGS — generation defaults, auto-pilot, etc.
-- ============================================================================

create table public.workspace_settings (
  workspace_id           uuid primary key references public.workspaces(id) on delete cascade,
  autopilot_default      boolean not null default true,
  default_batch_size     integer not null default 10,
  default_style_mix      text[] not null default '{ugc_talking_head, b_roll_vo}',
  default_run_mode       batch_run_mode not null default 'autopilot',
  notification_email     text,
  updated_at             timestamptz not null default now()
);

-- ============================================================================
-- TRIGGERS: keep updated_at fresh
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_offers_updated_at before update on public.offers for each row execute function public.set_updated_at();
create trigger trg_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger trg_ad_sets_updated_at before update on public.ad_sets for each row execute function public.set_updated_at();
create trigger trg_ads_updated_at before update on public.ads for each row execute function public.set_updated_at();
create trigger trg_workspace_settings_updated_at before update on public.workspace_settings for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTO-PROVISION WORKSPACE ON SIGN-UP
-- When a new auth.users row appears, create a workspace + profile automatically.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_workspace_id uuid;
  ws_name text;
  ws_slug text;
begin
  ws_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'My workspace');
  ws_slug := lower(regexp_replace(coalesce(ws_name, 'workspace'), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.workspaces (name, slug)
  values (ws_name, ws_slug)
  returning id into new_workspace_id;

  insert into public.profiles (id, workspace_id, full_name, avatar_url, role)
  values (
    new.id,
    new_workspace_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'owner'
  );

  insert into public.workspace_settings (workspace_id) values (new_workspace_id);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

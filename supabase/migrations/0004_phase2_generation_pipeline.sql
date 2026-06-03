-- ============================================================================
-- Phase 2: The Generation Pipeline
--
-- Adds the schema needed for the real async pipeline that turns wizard
-- inputs into finished MP4 ads:
--
--   • Presenters roster (UGC identity consistency across shots of an ad)
--   • Per-ad voiceover with word-level timings
--   • Per-shot rows for shotlist + per-shot video render state
--   • Pipeline config (admin-editable task→provider/model mapping, weighted
--     splits for A/B traffic, workspace-scoped overrides)
--   • Encrypted provider keys (AES-GCM at rest, decrypted server-side only)
--   • Generation events (per-stage observability for debugging)
--   • Task A/B runs (side-by-side compare tool output)
--
-- Additive only — existing tables get new columns, no enum drops.
-- ============================================================================

-- ─── Admin flag on profiles ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
create index if not exists profiles_admin_idx on public.profiles(is_admin) where is_admin = true;

-- ─── Extensions to existing tables ────────────────────────────────────────
-- Batches need an extracted offer brief, cost cap + spent, and an estimate
-- computed after shotlists for the pre-video gate.
alter table public.batches
  add column if not exists brief         jsonb,
  add column if not exists cost_cap      numeric(12,4),     -- hard cap in USD; null = no cap
  add column if not exists cost_estimate numeric(12,4),     -- computed after all shotlists, before video fan-out
  add column if not exists cost_spent    numeric(12,4) not null default 0;

-- Add a 'partial' status to ad_status (≥80% shots succeeded but some dead).
do $$
begin
  alter type ad_status add value if not exists 'partial';
exception when duplicate_object then null;
end $$;

-- Ads gain a locked presenter + error message + per-ad cost tally.
alter table public.ads
  add column if not exists presenter_id uuid,
  add column if not exists error        text,
  add column if not exists cost         numeric(12,4) not null default 0;

-- Ad_versions get a back-reference to the voiceover (set after voicing).
alter table public.ad_versions
  add column if not exists voiceover_id uuid;


-- ============================================================================
-- PRESENTERS — pre-built reusable AI presenters seeded across niches
-- ============================================================================

create table if not exists public.presenters (
  id              uuid primary key default uuid_generate_v4(),
  -- null workspace_id + is_system=true → global presenter available to everyone
  workspace_id    uuid references public.workspaces(id) on delete cascade,
  is_system       boolean not null default false,
  name            text not null,
  persona         text,                                    -- 'mom-next-door', 'gym-bro', 'finance-suit', 'tech-founder', ...
  niche_fit       text[] not null default '{}',            -- ['weight_loss', 'biz_opp'] for niche matching
  gender          text,                                    -- 'female' | 'male' | 'nonbinary'
  age_band        text,                                    -- '18-25' | '25-35' | '35-50' | '50+'
  ethnicity       text,                                    -- free text; matching is best-effort
  -- Provider-specific identity references — the VideoProvider adapter
  -- knows how to interpret these (trained character id, reference image, etc.)
  reference_id        text,                                -- provider's character/avatar id
  reference_image_url text,                                -- canonical still for img2vid pipelines
  voice_default       text,                                -- suggested ElevenLabs voice id (overridable per ad)
  notes               text,                                -- DR positioning notes
  active              boolean not null default true,
  metadata            jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists presenters_workspace_idx on public.presenters(workspace_id);
create index if not exists presenters_active_idx on public.presenters(active) where active = true;
create index if not exists presenters_niche_gin on public.presenters using gin(niche_fit);

alter table public.ads
  add constraint ads_presenter_fk
  foreign key (presenter_id) references public.presenters(id) on delete set null;


-- ============================================================================
-- VOICEOVERS — one per ad_version
-- ============================================================================

create table if not exists public.voiceovers (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  ad_id           uuid not null references public.ads(id) on delete cascade,
  ad_version_id  uuid not null references public.ad_versions(id) on delete cascade,
  audio_url       text not null,
  word_timings    jsonb not null default '[]'::jsonb,      -- [{word, start, end}, ...] — drives caption burn-in
  duration_seconds numeric(6,2),
  provider        text not null,                           -- 'elevenlabs' | 'mock' | ...
  model           text,
  voice_id        text,
  cost            numeric(10,6) not null default 0,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists voiceovers_workspace_idx on public.voiceovers(workspace_id);
create index if not exists voiceovers_ad_idx on public.voiceovers(ad_id);
create index if not exists voiceovers_ad_version_idx on public.voiceovers(ad_version_id);

alter table public.ad_versions
  add constraint ad_versions_voiceover_fk
  foreign key (voiceover_id) references public.voiceovers(id) on delete set null;


-- ============================================================================
-- SHOTS — the per-shot timeline that assembly stitches into a final ad
-- ============================================================================

create type shot_type as enum ('talking', 'broll');
create type shot_status as enum ('pending', 'generating', 'done', 'dead');

create table if not exists public.shots (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  ad_id           uuid not null references public.ads(id) on delete cascade,
  ad_version_id   uuid not null references public.ad_versions(id) on delete cascade,
  index           integer not null,                         -- 0-based shot order within the ad
  type            shot_type not null default 'talking',
  vo_text         text,                                     -- script text for this shot
  vo_start        numeric(6,3) not null,                    -- seconds into VO when this shot starts
  vo_end          numeric(6,3) not null,
  on_screen       text,                                     -- on-screen text overlay if any
  still_url       text,                                     -- image-ref for img2vid (stage 8a)
  video_url       text,                                     -- final per-shot clip (stage 8c)
  status          shot_status not null default 'pending',
  attempts        integer not null default 0,
  max_attempts    integer not null default 3,
  provider        text,                                     -- which video provider rendered this
  model           text,                                     -- which model
  provider_job_id text,                                     -- for polling/webhook correlation
  cost            numeric(10,6) not null default 0,
  error           text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (ad_version_id, index)
);
create index if not exists shots_workspace_idx on public.shots(workspace_id);
create index if not exists shots_ad_idx on public.shots(ad_id);
create index if not exists shots_ad_version_idx on public.shots(ad_version_id);
create index if not exists shots_status_idx on public.shots(status);
create index if not exists shots_provider_job_idx on public.shots(provider_job_id) where provider_job_id is not null;

create trigger trg_shots_updated_at before update on public.shots
  for each row execute function public.set_updated_at();


-- ============================================================================
-- PIPELINE CONFIG — admin-editable task→provider/model mapping
-- Supports weighted A/B splits (multiple rows per task; weights sum to 100).
-- Per-workspace overrides supported but null workspace_id = global default.
-- ============================================================================

-- Free-text task name so we can add tasks without a migration.
-- The allowed set lives in TS (src/lib/pipeline/tasks.ts) and is enforced at the application layer.
create table if not exists public.pipeline_config (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references public.workspaces(id) on delete cascade,  -- null = global default
  task            text not null,                            -- 'understand_offer' | 'generate_hooks' | ... | 'video'
  provider        text not null,                            -- 'anthropic' | 'google' | 'openai' | 'elevenlabs' | 'fal' | 'higgsfield' | 'mock'
  model           text not null,                            -- 'claude-sonnet-4-6' | 'gemini-2.5-pro' | 'kling-v2.5-pro' | ...
  params          jsonb not null default '{}'::jsonb,       -- temperature, max_tokens, voice_id, ...
  weight          integer not null default 100 check (weight between 0 and 100),
  enabled         boolean not null default true,
  label           text,                                     -- 'primary', 'experiment-a', ... for debugging
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pipeline_config_task_idx on public.pipeline_config(task) where enabled = true;
create index if not exists pipeline_config_workspace_idx on public.pipeline_config(workspace_id);

create trigger trg_pipeline_config_updated_at before update on public.pipeline_config
  for each row execute function public.set_updated_at();


-- ============================================================================
-- PROVIDER KEYS — AES-256-GCM encrypted at rest, decrypted server-side only
-- ============================================================================

create table if not exists public.provider_keys (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references public.workspaces(id) on delete cascade,  -- null = global
  provider        text not null,                            -- 'anthropic' | 'google' | 'elevenlabs' | 'fal' | 'higgsfield'
  label           text,                                     -- 'primary', 'billing-fallback', ...
  key_encrypted   bytea not null,                           -- AES-GCM ciphertext; nonce + tag prefixed
  last4           text not null,                            -- last 4 chars of plaintext for UI display
  active          boolean not null default true,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);
create index if not exists provider_keys_provider_idx on public.provider_keys(provider) where active = true;
create index if not exists provider_keys_workspace_idx on public.provider_keys(workspace_id);


-- ============================================================================
-- GENERATION EVENTS — structured per-stage log
-- ============================================================================

create type generation_event_level as enum ('info', 'warn', 'error');

create table if not exists public.generation_events (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  batch_id        uuid references public.batches(id) on delete cascade,
  ad_id           uuid references public.ads(id) on delete cascade,
  shot_id         uuid references public.shots(id) on delete cascade,
  stage           text not null,                            -- 'understand_offer' | 'generate_hooks' | ...
  level           generation_event_level not null default 'info',
  message         text not null,
  data            jsonb default '{}'::jsonb,                -- prompt, response, tokens, latency, raw provider payload
  created_at      timestamptz not null default now()
);
create index if not exists generation_events_workspace_idx on public.generation_events(workspace_id, created_at desc);
create index if not exists generation_events_batch_idx on public.generation_events(batch_id, created_at desc);
create index if not exists generation_events_ad_idx on public.generation_events(ad_id, created_at desc);
create index if not exists generation_events_level_idx on public.generation_events(level) where level <> 'info';


-- ============================================================================
-- TASK A/B RUNS — admin "test this task with model X vs Y" tool output
-- ============================================================================

create table if not exists public.task_ab_runs (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  task            text not null,
  offer_id        uuid references public.offers(id) on delete set null,
  input           jsonb not null default '{}'::jsonb,       -- the standardized input we sent both variants
  variants        jsonb not null default '[]'::jsonb,       -- [{provider, model, params, output, cost, latency_ms, tokens, error?}, ...]
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index if not exists task_ab_runs_workspace_idx on public.task_ab_runs(workspace_id, created_at desc);


-- ============================================================================
-- DEFAULT PIPELINE CONFIG — all tasks default to MOCK so the pipeline runs
-- end-to-end with zero external dependencies. Admin flips to real providers
-- once keys are added via /app/admin/keys + /app/admin/models.
-- ============================================================================

insert into public.pipeline_config (task, provider, model, params, weight, enabled, label) values
  ('understand_offer', 'mock', 'mock-llm', '{}'::jsonb, 100, true, 'default-mock'),
  ('generate_hooks',   'mock', 'mock-llm', '{}'::jsonb, 100, true, 'default-mock'),
  ('score_hooks',      'mock', 'mock-llm', '{}'::jsonb, 100, true, 'default-mock'),
  ('write_script',     'mock', 'mock-llm', '{}'::jsonb, 100, true, 'default-mock'),
  ('build_shotlist',   'mock', 'mock-llm', '{}'::jsonb, 100, true, 'default-mock'),
  ('voiceover',        'mock', 'mock-voice', '{"voice": "rachel"}'::jsonb, 100, true, 'default-mock'),
  ('image',            'mock', 'mock-image', '{}'::jsonb, 100, true, 'default-mock'),
  ('video',            'mock', 'mock-video', '{}'::jsonb, 100, true, 'default-mock')
on conflict do nothing;

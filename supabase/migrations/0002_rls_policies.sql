-- ============================================================================
-- Row-Level Security: every table is workspace-scoped.
-- Helper: current_workspace_id() reads from the authenticated user's profile.
-- ============================================================================

create or replace function public.current_workspace_id()
returns uuid language sql stable security definer as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.workspaces         enable row level security;
alter table public.profiles           enable row level security;
alter table public.offers             enable row level security;
alter table public.campaigns          enable row level security;
alter table public.ad_sets            enable row level security;
alter table public.ads                enable row level security;
alter table public.ad_versions        enable row level security;
alter table public.ad_placements      enable row level security;
alter table public.batches            enable row level security;
alter table public.templates          enable row level security;
alter table public.presets            enable row level security;
alter table public.voice_files        enable row level security;
alter table public.integrations       enable row level security;
alter table public.jobs               enable row level security;
alter table public.credit_ledger      enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.webhook_events     enable row level security;

-- ---------------------------------------------------------------------------
-- WORKSPACES: a user can read+update their own workspace
-- ---------------------------------------------------------------------------
create policy "ws read own" on public.workspaces for select
  using (id = public.current_workspace_id());
create policy "ws update own" on public.workspaces for update
  using (id = public.current_workspace_id());

-- ---------------------------------------------------------------------------
-- PROFILES: read/update own; profile creation handled by trigger
-- ---------------------------------------------------------------------------
create policy "profile read own" on public.profiles for select
  using (id = auth.uid() or workspace_id = public.current_workspace_id());
create policy "profile update own" on public.profiles for update
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Generic helper macro pattern: ALL CRUD scoped to current_workspace_id()
-- ---------------------------------------------------------------------------
-- OFFERS
create policy "offers all" on public.offers for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- CAMPAIGNS
create policy "campaigns all" on public.campaigns for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- AD SETS
create policy "ad_sets all" on public.ad_sets for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- ADS
create policy "ads all" on public.ads for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- AD VERSIONS — inherit from parent ad
create policy "ad_versions read" on public.ad_versions for select
  using (exists (select 1 from public.ads where ads.id = ad_versions.ad_id and ads.workspace_id = public.current_workspace_id()));
create policy "ad_versions write" on public.ad_versions for insert
  with check (exists (select 1 from public.ads where ads.id = ad_versions.ad_id and ads.workspace_id = public.current_workspace_id()));

-- AD PLACEMENTS
create policy "ad_placements all" on public.ad_placements for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- BATCHES
create policy "batches all" on public.batches for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- TEMPLATES: workspace-scoped OR system (is_system = true and workspace_id is null)
create policy "templates read" on public.templates for select
  using (is_system = true or workspace_id = public.current_workspace_id());
create policy "templates write own" on public.templates for insert
  with check (workspace_id = public.current_workspace_id() and is_system = false);
create policy "templates update own" on public.templates for update
  using (workspace_id = public.current_workspace_id() and is_system = false);
create policy "templates delete own" on public.templates for delete
  using (workspace_id = public.current_workspace_id() and is_system = false);

-- PRESETS
create policy "presets all" on public.presets for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- VOICE FILES
create policy "voice_files all" on public.voice_files for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- INTEGRATIONS
create policy "integrations all" on public.integrations for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- JOBS — read all in workspace; writes from clients limited to insert (service role does the rest)
create policy "jobs read" on public.jobs for select
  using (workspace_id = public.current_workspace_id());
create policy "jobs insert" on public.jobs for insert
  with check (workspace_id = public.current_workspace_id());

-- CREDIT LEDGER — read only for users
create policy "credit_ledger read" on public.credit_ledger for select
  using (workspace_id = public.current_workspace_id());

-- WORKSPACE SETTINGS
create policy "ws_settings all" on public.workspace_settings for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- WEBHOOK EVENTS — service role only (no policies for authenticated users)
-- Intentionally no policies => no access for anon/authenticated; only service_role bypasses RLS.

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('voice-files', 'voice-files', false, 52428800),       -- 50 MB
  ('ad-thumbnails', 'ad-thumbnails', true, 5242880),     -- 5 MB, public for ad previews
  ('ad-videos', 'ad-videos', true, 524288000)            -- 500 MB
on conflict (id) do nothing;

-- Voice files: workspace-scoped via path prefix '{workspace_id}/...'
create policy "voice_files storage read" on storage.objects for select
  using (bucket_id = 'voice-files' and (storage.foldername(name))[1] = public.current_workspace_id()::text);
create policy "voice_files storage write" on storage.objects for insert
  with check (bucket_id = 'voice-files' and (storage.foldername(name))[1] = public.current_workspace_id()::text);
create policy "voice_files storage delete" on storage.objects for delete
  using (bucket_id = 'voice-files' and (storage.foldername(name))[1] = public.current_workspace_id()::text);

-- ============================================================================
-- Phase 2 RLS: workspace-scoped + admin-only patterns
--
--   • Workspace-scoped (same pattern as Phase 1): voiceovers, shots,
--     generation_events, task_ab_runs.
--   • Admin-only: pipeline_config, provider_keys, presenters write/admin path
--     (read of system presenters allowed for all workspace members).
--
-- All admin endpoints ALSO assertAdmin() server-side — RLS here is defense
-- in depth, not the only gate.
-- ============================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ─── Enable RLS on all new tables ──────────────────────────────────────────
alter table public.presenters         enable row level security;
alter table public.voiceovers         enable row level security;
alter table public.shots              enable row level security;
alter table public.pipeline_config    enable row level security;
alter table public.provider_keys      enable row level security;
alter table public.generation_events  enable row level security;
alter table public.task_ab_runs       enable row level security;

-- ─── PRESENTERS ────────────────────────────────────────────────────────────
-- Read: system presenters (workspace_id null + is_system) visible to everyone;
--       workspace presenters only to that workspace.
create policy "presenters read" on public.presenters for select
  using (
    (is_system = true and workspace_id is null)
    or workspace_id = public.current_workspace_id()
  );
-- Write: admin only (avoids accidental seed corruption from app code).
create policy "presenters admin write" on public.presenters for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── VOICEOVERS ────────────────────────────────────────────────────────────
create policy "voiceovers all" on public.voiceovers for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- ─── SHOTS ─────────────────────────────────────────────────────────────────
create policy "shots all" on public.shots for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- ─── PIPELINE CONFIG ───────────────────────────────────────────────────────
-- Read: every workspace member can read GLOBAL config (so the registry can
--       resolve providers even without admin). Workspace overrides only
--       visible to that workspace.
create policy "pipeline_config read" on public.pipeline_config for select
  using (
    workspace_id is null
    or workspace_id = public.current_workspace_id()
  );
-- Write: admin only.
create policy "pipeline_config admin write" on public.pipeline_config for insert
  with check (public.is_admin());
create policy "pipeline_config admin update" on public.pipeline_config for update
  using (public.is_admin())
  with check (public.is_admin());
create policy "pipeline_config admin delete" on public.pipeline_config for delete
  using (public.is_admin());

-- ─── PROVIDER KEYS ─────────────────────────────────────────────────────────
-- Nothing about provider_keys is ever exposed to non-admins. Even reading the
-- ciphertext is admin-only — decryption happens in service-role server code.
create policy "provider_keys admin only" on public.provider_keys for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── GENERATION EVENTS ─────────────────────────────────────────────────────
-- Workspace members can read their own events (for debugging surfaces);
-- writes happen via service role only.
create policy "generation_events read own" on public.generation_events for select
  using (workspace_id = public.current_workspace_id());

-- ─── TASK A/B RUNS ─────────────────────────────────────────────────────────
-- Admin-only — this is for model evaluation, not user-facing.
create policy "task_ab_runs admin only" on public.task_ab_runs for all
  using (public.is_admin())
  with check (public.is_admin());

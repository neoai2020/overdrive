# Overdrive

The creative engine for Direct Response media buyers. 50+ hyper-realistic UGC, b-roll, and testimonial ads — built in bulk and pushed straight into Meta campaigns.

This repo holds **both** the marketing site and the authenticated app:

| Surface | Path | Tech |
|---|---|---|
| Landing | `/` | Static HTML (preserved from the live site) |
| Auth | `/auth/login`, `/auth/signup` | Next.js + Supabase Auth |
| App | `/app/*` | Next.js App Router · TS · Tailwind v4 · React Query · Supabase |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Apply schema to your Supabase project (one-time)
#    Easiest: paste each file from supabase/migrations/*.sql into the Supabase SQL editor in order.
#    Or via Supabase CLI: supabase db push

# 4. Run dev
npm run dev
# → http://localhost:3000  → landing
# → http://localhost:3000/auth/signup → create account, get redirected into /app

# 5. (optional) Seed mock data for your new account
npx tsx scripts/seed.ts your@email.com

# 6. (optional, Phase 2) Run the Inngest dev server so the generation pipeline executes
#    Picks up /api/inngest automatically.
npx inngest-cli@latest dev
```

---

## Phase 2 — The Generation Pipeline

The wizard's **Generate** button now kicks off a real async pipeline (Inngest +
provider adapters) that turns one user input into N finished MP4 ads. By default
every stage runs against `MockProvider`, so the pipeline is fully runnable
without external API keys — flip rows in `/app/admin/models` once keys are added.

### Architecture in one diagram

```
POST /api/batches  →  batches row (queued)  →  inngest.send "batch.created"
                                                       ↓
        runBatch(parent) : understand-offer → hooks → score → [review?] → fan-out
                                                       ↓ (per ad)
           runAd  : write-script → [review?] → presenter → voiceover (audio + word timings)
                                  → build-shotlist → fan-out → qa → assemble (Modal FFmpeg)
                                                       ↓ (per shot)
              runShot : gen-still → submit clip → (webhook OR poll w/ backoff) → persist

Realtime  ← batches/ads/shots updates ← Supabase ← runBatch/runAd/runShot writes
Browser   ← (UI re-renders from DB state, no polling)
```

The DB is the message board. The browser never talks to a provider; the pipeline
never talks to the browser. Every stage writes to `generation_events` for the
admin Runs viewer.

### Provider adapters

Every external capability is behind a typed interface (`src/lib/providers/types.ts`):

| Capability | Interface | Adapters shipped |
|---|---|---|
| LLM (5 tasks) | `LLMProvider.complete()` | `mock`, `anthropic` (Claude), `google` (Gemini) |
| Voice         | `VoiceProvider.synthesize()` | `mock`, `elevenlabs` |
| Image         | `ImageProvider.generate()` | `mock`, `google` (nano-banana), `fal` (Flux) |
| Video         | `VideoProvider.submit/poll/parseWebhook()` | `mock`, `fal` (Kling/Veo/Sora/Hunyuan), `higgsfield` |

The pipeline asks the **registry** (`src/lib/providers/registry.ts`) for the
adapter assigned to a task. The registry reads `pipeline_config`, picks one row
(weighted A/B), resolves the API key (`workspace key → global key → env`),
constructs the adapter, returns it. Pipeline code never sees a model name unless
it logs one.

### Admin control panel (`/app/admin`, `is_admin = true` only)

| Page | What it does |
|---|---|
| `/app/admin/models`     | Task → provider/model dropdown. Multiple rows per task = weighted A/B split. Disable/enable, edit params. |
| `/app/admin/keys`       | Add provider API keys (AES-256-GCM encrypted at rest). Rotate or disable per key. Plaintext never leaves the server. |
| `/app/admin/test`       | Run one input through N variants in parallel. Compare outputs + cost + latency side-by-side. Result rows persist in `task_ab_runs`. |
| `/app/admin/presenters` | View the 25 seeded UGC presenters (the roster the pipeline picks from for identity consistency). |
| `/app/admin/runs`       | Live tail of `generation_events`. Filter by batch/ad/stage/level. Click a row to inspect raw `data`. |

To bootstrap the first admin (one-time): set `PIPELINE_BOOTSTRAP_SECRET=<random>`
in env, sign up, then `POST /api/admin/bootstrap` with `{"secret": "<value>"}`.

Or just flip the flag in SQL:
```sql
update profiles set is_admin = true where id = '<user-uuid>';
```

### Phase 2 environment variables

```bash
# Encryption — REQUIRED before adding any provider key
PIPELINE_ENCRYPTION_KEY=                # 32 random bytes, base64 (44 chars)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Inngest — leave blank to use the local dev runner via `inngest-cli`
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Provider keys — admin can also set these in the DB via /app/admin/keys
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
ELEVENLABS_API_KEY=
FAL_KEY=
HIGGSFIELD_API_KEY=

# Modal FFmpeg assembly service — leave blank to use the in-process MockFfmpeg
# fallback (which reuses the first shot's URL as the final video — fine for
# local dev but not production).
MODAL_FFMPEG_ENDPOINT=
MODAL_FFMPEG_SECRET=

# Optional: enable POST /api/admin/bootstrap to promote the first admin
PIPELINE_BOOTSTRAP_SECRET=
```

### Deploying the Modal FFmpeg service

```bash
pip install modal
modal token new
modal deploy modal/ffmpeg_assemble.py
# → prints the public URL; copy it into MODAL_FFMPEG_ENDPOINT.
```

The service runs on Modal's serverless infra (FFmpeg pre-installed, scales to
zero, ~$0.00012/sec CPU). It downloads the per-shot clips + VO audio, concats,
burns word-level captions from `word_timings`, transcodes to 9:16 H.264, generates
a thumbnail, and uploads both straight to Supabase Storage via the service-role
key. Returns `{ duration_seconds, bytes, cost_usd }`.

### Smoke-testing the pipeline

```bash
# Quick: verify registry + mock adapters + DB writes work
npx tsx scripts/smoke-pipeline.ts your@email.com

# Full end-to-end: requires both servers running
npx inngest-cli@latest dev          # terminal 1
npm run dev                          # terminal 2
# Then sign in, run the Generate wizard. Watch /app/admin/runs for live events.
```

---

## Project structure

```
src/
  app/
    page.tsx                 ← root fallback (real / served from public/_landing/)
    layout.tsx               ← global fonts, providers, toasts
    globals.css              ← Tailwind v4 + brand tokens
    auth/                    ← /auth/login, /signup, /callback, /signout
    app/                     ← THE APP (everything under /app/*)
      layout.tsx             ← gates on Supabase session, renders shell
      page.tsx               ← Home (mission control)
      campaigns/...          ← list, detail, ad-set detail
      ads/                   ← library
      batches/...            ← runs list + detail (with realtime progress)
      research/...           ← offers list + offer detail
      templates/             ← system + custom templates
      voice/                 ← knowledge base (swipes, scripts, brand voice)
      lab/                   ← Phase 2 placeholder
      learn/                 ← concept docs
      integrations/          ← Meta connect
      settings/              ← workspace, account, danger zone

  components/
    app-shell/               ← Sidebar, TopBar, ShellFrame
    ui/                      ← Button, Input, Card, Modal, StatusPill, ...
    wizards/                 ← Campaign Builder + Generate Ads wizards
    ad-card.tsx, campaign-row.tsx, ...
    providers.tsx            ← React Query
    page-header.tsx
    auth-frame.tsx

  lib/
    supabase/                ← browser, server, middleware, admin client
    services/index.ts        ← generateBatch, analyzeOffer, pushToMeta (mocked in Phase 1)
    hooks/                   ← use-realtime, use-active-runs
    types/database.ts        ← hand-written Row types
    utils.ts

supabase/
  migrations/
    0001_initial_schema.sql  ← all tables + enums + triggers
    0002_rls_policies.sql    ← workspace-scoped RLS + storage policies
    0003_seed_system_templates.sql ← 5 system templates

scripts/
  seed.ts                    ← creates 6 offers, 4 campaigns, 11 ad sets, ~50 ads

public/
  _landing/index.html        ← the deployed marketing site (intact)
  assets/                    ← landing static assets

middleware.ts                ← Supabase session refresh + /app/* gate
next.config.ts               ← rewrite "/" → "/_landing/index.html"
```

---

## Data model (decisions worth knowing)

The brief proposed a simple Offer → Campaign → Ad Set → Ad hierarchy. We kept that mental model but unbundled a few things that **will** break later if you don't:

1. **Ads ↔ Ad sets is many-to-many** (`ad_placements` join table). One creative can live in multiple audiences without duplicating versions.
2. **Ads have immutable `ad_versions`.** `ads.current_version_id` points at the live one. Regenerations don't destroy history.
3. **Batches own generated ads; assignment is separate.** Generation and distribution stay independent.
4. **Research output lives on the Offer.** No "brief" entity — angles, objections, avatar are columns on `offers`. One source of truth.
5. **`jobs` is a generic async runner.** Every long-running operation (generate, push, analyze) creates a job row with progress + idempotency. Phase 2 worker picks this up.
6. **`webhook_events` is a durable inbox** for Meta callbacks (leadgen, etc.) — survives crashes, makes deduping trivial.
7. **`credit_ledger` is append-only, per-step.** Every charge has a `reason` so billing audits are a `SELECT`.
8. **Templates vs Presets are different tables on purpose.** Templates = creative structures (beats). Presets = saved wizard configs. Conflating them is a Phase 3 refactor headache.

See `supabase/migrations/0001_initial_schema.sql` for the full picture — inline comments explain every non-obvious choice.

---

## Supabase setup (one-time)

### Option A — fresh project (recommended)

1. Go to https://supabase.com/dashboard → **New project**. Pick `us-east-1`, give it a strong DB password.
2. **Settings → API** → copy `Project URL`, `anon public key`, `service_role key` into `.env.local`.
3. **SQL Editor** → paste `supabase/migrations/0001_initial_schema.sql` → Run. Then `0002`, then `0003`.
4. **Authentication → URL configuration** → add `http://localhost:3000` and your prod URL to allowed redirects.
5. (Optional) **Authentication → Providers → Google** → enable + paste client id/secret.

### Option B — Supabase CLI

```bash
npm i -g supabase
supabase login
supabase link --project-ref <YOUR_REF>
supabase db push
```

### Verify

After applying migrations, run `npx tsx scripts/seed.ts your@email.com` (after signing up). You should see:

- 6 offers in `/app/research`
- 4 campaigns in `/app/campaigns`
- 11 ad sets nested inside campaigns
- ~50 ads in `/app/ads`
- 5 system templates + custom presets

---

## Deployment — DigitalOcean App Platform

The app is deployed via `.do/app.yaml` as a **Web Service** (Node) — not a Static Site anymore. DO rebuilds and redeploys automatically on every push to `main` (`deploy_on_push: true`).

```yaml
services:
  - name: overdrive-web
    build_command: npm ci && npm run build
    run_command: npm start -- --port $PORT --hostname 0.0.0.0
    http_port: 8080
    instance_size_slug: basic-xs
    health_check: { http_path: / }
```

### First deploy on the new shape

The previous DO app was a Static Site — that component type can't run Next.js. You need to either:

**A. Reapply the app spec** (preserves the app + domain):
```bash
doctl apps update <app-id> --spec .do/app.yaml
```
DO will see `services:` instead of `static_sites:` and recreate the component as a Web Service.

**B. Or rebuild from the dashboard:** Apps → overdrive → Settings → App Spec → Edit → paste `.do/app.yaml`.

### Required secret — set in the DO dashboard

The app spec only contains **public** env vars (Supabase URL + anon key, both safe to ship in the browser bundle, plus `NEXT_PUBLIC_SITE_URL`). One secret has to be set manually:

| Key | Where | Why |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | DO dashboard → Apps → overdrive → Settings → App-Level Env → Edit, scope `RUN_AND_BUILD_TIME`, type `SECRET` | Server-only. Bypasses RLS. Never ships to the browser. |

Get it from Supabase dashboard → Settings → API → `service_role` secret.

### Instance size

`basic-xs` ($12/mo · 1 vCPU · 1 GB RAM) is the floor for a Next.js app — the `npm run build` step needs the memory. `basic-xxs` (512 MB) will OOM during build.

### Note on `.ad` TLD + ad blockers

`.ad` is a TLD often blocked by ad blockers (uBlock, Brave Shields, DNS-level filters). For organic / direct traffic this is fine. **For paid traffic, use a different domain** (`.com`, `.io`) — buy one, add it under Apps → overdrive → Settings → Domains, and use it as the destination URL in your Meta ads.

---

## What's stubbed vs real (Phase 1 → Phase 2)

| Real today | Stubbed (clean swap point in Phase 2) |
|---|---|
| Auth, sessions, RLS | LLM-driven offer research (`analyzeOffer`) |
| Schema, mutations, queries | Hook/script/video generation (`generateBatch`) |
| Realtime row/table hooks | Meta Graph API push (`pushToMeta`) |
| Wizards (persist real rows) | UGC talent rendering |
| Progress UI (drives off `batches.progress_*`) | Webhook handlers |
| Credit ledger writes | Background worker queue |

Every stub lives in `src/lib/services/index.ts` with a clean interface. Swap each function body to call your worker queue — no UI change required.

---

## Phase 2 — what's shipped

- **⌘K command palette** — opens from anywhere; searches offers, campaigns, ads, batches, templates in parallel; jumps to any page; launches the wizards (`⌘C` for new campaign, `⌘G` for generate ads).
- **Ad detail page** — `/app/ads/[id]` with player, inline-editable hook/script, version history, list of placements, push-to-ad-set + duplicate + archive actions.
- **Bulk action toolbar** on every ad grid — shift-click for range, `x` to toggle, `enter` to open; floating toolbar appears when ≥1 selected with push-to-set / duplicate / archive (all batched, idempotent).
- **j/k keyboard nav** — vim-style on ads grids (also `h`/`l` and arrow scroll-into-view). `enter` opens, `esc` clears selection.
- **Inline edit** on campaign + ad-set names and daily budgets — click name or number, save on enter/blur, escape to cancel.

### What's still Phase 2+

- Lab (hook tournament, A/B variant, style experiment)
- Real Meta OAuth + Graph API push (today `pushToMeta` writes a mocked `meta_ad_id` to `ad_placements`)
- LLM-driven offer research (`analyzeOffer`) and real video rendering pipeline

---

## Conventions

- **Routes go in `src/app/app/*`** — never under `src/app/(app)` so the URL stays explicit (`/app/campaigns`).
- **Server components by default**; mark client-only when you need state or events.
- **Always tolerate missing schema** in server components — wrap Supabase calls in `try/catch` and fall back to empty arrays. The app never white-screens before migrations run.
- **Brand tokens live in `globals.css`** under `@theme` — use them via `text-[color:var(--color-acid)]` etc. so the design system stays single-source.
- **Types live in `src/lib/types/database.ts`** — once your project is up, replace it with `supabase gen types typescript`.

---

## Scripts

```bash
npm run dev          # next dev (Turbopack)
npm run build        # next build
npm run start        # next start
npm run lint         # eslint
npx tsx scripts/seed.ts <email>  # seed mock data
```

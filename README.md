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

## Deployment

### Vercel (recommended — Next.js native)

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SITE_URL
vercel deploy --prod
```

Then in Vercel project settings:
- **Domains** → add `overdrive.ad` (and `www.overdrive.ad`)
- Switch DNS at Namecheap to Vercel's name servers (or point ALIAS/CNAME records per Vercel's instructions)

### Migrating from DigitalOcean

The current static site lives on DigitalOcean App Platform at `overdrive-bbcaw.ondigitalocean.app`. Once Vercel is live and `overdrive.ad` resolves there, delete the DO App to stop the bill.

The marketing site **content** is preserved 1:1 — `public/_landing/index.html` is the same file currently deployed.

### Note on `.ad` TLD + ad blockers

`.ad` is a TLD often blocked by ad blockers (uBlock, Brave Shields, DNS-level filters). For organic / direct traffic this is fine. **For paid traffic, use a different domain** (`.com`, `.io`) — buy one, point it at the same Vercel deploy, and use it as the destination URL in your Meta ads.

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

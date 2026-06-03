# syntax=docker/dockerfile:1
#
# Next.js 16 (App Router, Turbopack) production image.
# Multi-stage so node_modules stays out of the final runtime image.
# Targets Node 22 LTS (npm 10) — DO buildpack gave us Node 16 then Node 26,
# neither of which builds Next.js cleanly, so we pin it ourselves.

# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
# Next.js needs libc6-compat on Alpine for some native bindings.
RUN apk add --no-cache libc6-compat


# ─── Deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json ./
# npm install (not ci) — no lockfile in repo; resolve platform-correct
# optional deps (@next/swc-linux-musl-arm64, @tailwindcss/oxide-*) for THIS
# Linux/Alpine container at install time.
RUN npm install --no-audit --no-fund


# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars must be present at build time so Next bakes them into the
# client bundle. DO passes these in via build_args (declared in .do/app.yaml).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ─── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Drop root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# `next start` honours $PORT and $HOSTNAME — no need for CLI flags.
CMD ["npm", "start"]

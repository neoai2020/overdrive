/**
 * Inngest client + the canonical event-type map.
 *
 * Local dev:   npx inngest-cli@latest dev
 *   (auto-discovers the /api/inngest endpoint and runs functions in-process)
 *
 * Production:  set INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY env vars and
 *              register https://<your-domain>/api/inngest in the Inngest dashboard.
 */

import { EventSchemas, Inngest } from "inngest";

type Events = {
  /* ─── User-initiated kickoff ───────────────────────────────────────── */
  "batch.created": {
    data: {
      batchId: string;
      workspaceId: string;
    };
  };

  /* ─── Per-ad fan-out (emitted by runBatch) ─────────────────────────── */
  "ad.created": {
    data: {
      batchId: string;
      adId: string;
      workspaceId: string;
    };
  };

  /* ─── Per-shot fan-out (emitted by runAd) ──────────────────────────── */
  "shot.created": {
    data: {
      shotId: string;
      adId: string;
      batchId: string;
      workspaceId: string;
    };
  };

  /* ─── Review-mode resume signals (POST /api/batches/:id/approve) ───── */
  "batch.hooks.approved": {
    data: { batchId: string; edits?: { adId: string; hook: string }[] };
  };
  "ad.script.approved": {
    data: { adId: string; batchId: string; editedScript?: unknown };
  };

  /* ─── Provider webhook → Inngest bridge ────────────────────────────── */
  "shot.video.done": {
    data: {
      shotId: string;
      jobId: string;
      videoUrl: string;
      durationSeconds: number;
      cost_usd: number;
    };
  };
  "shot.video.failed": {
    data: { shotId: string; jobId: string; error: string; retryable: boolean };
  };

  /* ─── Regeneration triggers ────────────────────────────────────────── */
  "ad.regenerate": {
    data: { adId: string; fromStage: "script" | "voice" | "shotlist" | "shots" | "assemble" };
  };
  "shot.regenerate": {
    data: { shotId: string };
  };

  /* ─── Admin A/B compare ────────────────────────────────────────────── */
  "admin.test.requested": {
    data: {
      runId: string;
      task: string;
      variants: { provider: string; model: string; params: Record<string, unknown> }[];
      input: Record<string, unknown>;
      workspaceId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "overdrive",
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type OverdriveEvents = Events;

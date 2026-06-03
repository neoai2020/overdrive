/**
 * Inngest HTTP endpoint. The Inngest dev server (and prod cloud) discovers
 * registered functions from this route.
 *
 * Local:  npx inngest-cli@latest dev   (auto-detects http://localhost:3000/api/inngest)
 * Prod:   register https://<your-domain>/api/inngest in the Inngest dashboard.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runBatch, closeBatchIfDone } from "@/lib/inngest/functions/run-batch";
import { runAd } from "@/lib/inngest/functions/run-ad";
import { runShot } from "@/lib/inngest/functions/run-shot";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runBatch, closeBatchIfDone, runAd, runShot],
});

// Inngest dev server makes calls that can outlive the default 60s timeout.
export const maxDuration = 300;

/**
 * Helpers for writing to `generation_events` and incrementing cost counters.
 * Used by every Inngest step so the admin "runs" viewer and the cost meter
 * stay in sync.
 *
 * Server-only — must not be imported from a Client Component.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

type Level = "info" | "warn" | "error";

export async function logEvent(args: {
  workspaceId: string;
  batchId?: string | null;
  adId?: string | null;
  shotId?: string | null;
  stage: string;
  level?: Level;
  message: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createAdminClient();
  try {
    await supabase.from("generation_events").insert({
      workspace_id: args.workspaceId,
      batch_id: args.batchId ?? null,
      ad_id: args.adId ?? null,
      shot_id: args.shotId ?? null,
      stage: args.stage,
      level: args.level ?? "info",
      message: args.message,
      data: args.data ?? {},
    });
  } catch (e) {
    // Logging should never crash the pipeline. Surface to stderr.
    console.error("[generation_events] insert failed", e);
  }
}

/**
 * Add cost to a batch row, and (optionally) bump the workspace credits_used
 * counter so the UI meter ticks in real time.
 *
 * Costs are in USD; credits are workspace-defined (1 credit = $0.01 here).
 */
export async function addCost(args: {
  workspaceId: string;
  batchId: string;
  costUsd: number;
  /** Optional: also append a credit_ledger row for full audit trail. */
  reason?: string;
  relatedTable?: string;
  relatedId?: string;
}): Promise<void> {
  if (!args.costUsd || args.costUsd <= 0) return;
  const supabase = await createAdminClient();

  // Increment batch.cost_spent (atomic via RPC would be cleaner; use update + select for v1).
  const { data: batch } = await supabase
    .from("batches")
    .select("cost_spent, workspace_id")
    .eq("id", args.batchId)
    .single();
  const newSpent = Number(batch?.cost_spent ?? 0) + Number(args.costUsd);
  await supabase.from("batches").update({ cost_spent: newSpent }).eq("id", args.batchId);

  // Optional ledger entry.
  if (args.reason) {
    await supabase.from("credit_ledger").insert({
      workspace_id: args.workspaceId,
      delta: -Math.ceil(args.costUsd * 100), // 1 credit = 1 cent
      reason: args.reason,
      related_table: args.relatedTable ?? "batches",
      related_id: args.relatedId ?? args.batchId,
    });
  }
}

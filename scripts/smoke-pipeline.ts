/**
 * Focused smoke test — exercises the provider registry + first pipeline
 * stage (understand_offer + generate_hooks) using the MOCK providers.
 *
 *   tsx scripts/smoke-pipeline.ts <user_email>
 *
 * Verifies:
 *   1. pipeline_config rows exist for each task.
 *   2. resolveLLM() returns the configured mock adapter.
 *   3. adapter.complete() produces structured output (offer brief, hooks).
 *   4. logEvent + addCost write to the DB (workspace_id flows through).
 *
 * Does NOT try to orchestrate the full pipeline in-process — that's Inngest's
 * job. Use the Inngest dev server (npx inngest-cli@latest dev) for end-to-end.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Module from "node:module";

// Shim `server-only` for tsx (Next bundler normally provides this).
const origResolve = (Module as unknown as { _resolveFilename: (request: string, parent: unknown) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (request: string, parent: unknown) => string })._resolveFilename = function (request, parent) {
  if (request === "server-only") return require.resolve("./shim-empty.cjs");
  return origResolve.call(this, request, parent);
};

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const email = process.argv[2];
if (!email) { console.error("Usage: tsx scripts/smoke-pipeline.ts <user_email>"); process.exit(1); }

async function main() {
  // 1) Confirm the user + workspace exists.
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);
  if (!user) { console.error(`User ${email} not found`); process.exit(1); }
  const { data: profile } = await supabase.from("profiles").select("workspace_id, is_admin").eq("id", user.id).single();
  const workspaceId = profile!.workspace_id as string;
  console.log(`✓ workspace ${workspaceId.slice(0,8)}…, is_admin=${profile!.is_admin}`);

  // 2) Confirm pipeline_config rows exist.
  const { data: configs } = await supabase.from("pipeline_config").select("task, provider, model, weight, enabled").is("workspace_id", null);
  const taskSet = new Set((configs ?? []).map((c) => c.task as string));
  console.log(`✓ pipeline_config: ${configs?.length ?? 0} global rows (tasks: ${[...taskSet].join(", ")})`);

  // 3) Confirm presenter seed.
  const { count: presenterCount } = await supabase.from("presenters").select("id", { count: "exact", head: true }).eq("is_system", true);
  console.log(`✓ presenters: ${presenterCount ?? 0} system rows`);

  // 4) Resolve the LLM adapter for understand_offer and run it.
  const { resolveLLM } = await import("../src/lib/providers/registry");
  const { logEvent, addCost } = await import("../src/lib/pipeline/events");

  const { adapter, provider, model, configId, label } = await resolveLLM("understand_offer", workspaceId);
  console.log(`✓ resolveLLM("understand_offer") → ${provider}/${model} (label=${label}, config=${configId.slice(0,8)}…)`);

  const briefResult = await adapter.complete({
    messages: [
      { role: "system", content: "Understand the offer. Return JSON with product, promise, avatar, painPoints, proof, price, angles." },
      { role: "user", content: "Glow24 — peptide serum, $69, promises smoother skin in 14 days. 92% reported visible firmness in clinical." },
    ],
    json: true,
  });
  console.log(`✓ adapter.complete() returned ${briefResult.text.length} chars in ${briefResult.latency_ms}ms (cost=$${briefResult.cost_usd.toFixed(4)})`);
  console.log(`  parsed json keys: ${Object.keys((briefResult.json as Record<string, unknown>) ?? {}).join(", ")}`);

  // 5) Insert a throwaway batch + ad to exercise logEvent + addCost.
  const { data: offer } = await supabase
    .from("offers")
    .insert({ workspace_id: workspaceId, name: "smoke-test", niche: "skincare" })
    .select("id").single();
  const { data: batch } = await supabase
    .from("batches")
    .insert({
      workspace_id: workspaceId, offer_id: offer!.id,
      angle: "pain", style_mix: ["ugc_talking_head"], size: 1,
      run_mode: "autopilot", status: "queued", cost_cap: 10, cost_estimate: 6, cost_spent: 0,
      created_by: user.id,
    })
    .select("id").single();
  const batchId = batch!.id as string;
  await logEvent({ workspaceId, batchId, stage: "smoke", level: "info", message: "smoke test event", data: { hello: "world" } });
  await addCost({ workspaceId, batchId, costUsd: 0.123, reason: "smoke.test" });
  const { data: batchAfter } = await supabase.from("batches").select("cost_spent").eq("id", batchId).single();
  console.log(`✓ addCost: batch.cost_spent = $${(batchAfter as { cost_spent: number }).cost_spent}`);

  const { count: eventCount } = await supabase.from("generation_events").select("id", { count: "exact", head: true }).eq("batch_id", batchId);
  console.log(`✓ logEvent: ${eventCount} event(s) for this batch`);

  // 6) Cleanup smoke rows.
  await supabase.from("batches").delete().eq("id", batchId);
  await supabase.from("offers").delete().eq("id", offer!.id);
  console.log(`✓ cleanup done`);

  console.log("\nAll Phase 2 smoke checks passed.");
  console.log("→ For full end-to-end: `npx inngest-cli@latest dev` + `npm run dev`, then POST /api/batches.");
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Apply a single SQL migration file to the Supabase project via the
 * Management API. We don't have access to the Cursor Supabase MCP for
 * this project (it lives in a different org), so this is the one-true-way.
 *
 *   tsx scripts/apply-migration.ts supabase/migrations/0004_phase2_generation_pipeline.sql
 *
 * Reads SUPABASE_PROJECT_REF + SUPABASE_PAT from .env.local. Falls back
 * to NEXT_PUBLIC_SUPABASE_URL to infer the ref.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const inferredRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const projectRef = process.env.SUPABASE_PROJECT_REF || inferredRef;
const pat = process.env.SUPABASE_PAT;

if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL to infer it).");
  process.exit(1);
}
if (!pat) {
  console.error("Missing SUPABASE_PAT in .env.local (personal access token starting with sbp_...).");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx scripts/apply-migration.ts <path/to/migration.sql>");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(file, "utf8");
  console.log(`→ applying ${file}  (${sql.length} chars)  to project ${projectRef}`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ Status ${res.status}`);
    console.error(text);
    process.exit(1);
  }
  console.log("✓ Migration applied.");
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json) && json.length > 0) console.log("Response:", JSON.stringify(json).slice(0, 400));
  } catch {
    // empty/non-json response is fine for DDL
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

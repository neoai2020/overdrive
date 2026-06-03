/**
 * Regenerate src/lib/types/database.generated.ts from the live Supabase schema.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run types:gen
 *
 * Project ref is inferred from NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing in .env.local");
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN env var missing (https://supabase.com/dashboard/account/tokens)");

const ref = new URL(url).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/types/typescript`;

console.log(`Generating types from ${ref}…`);
const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const body = (await res.json()) as { types: string };

const header = `/**
 * AUTO-GENERATED from the live Supabase schema. Do NOT edit by hand.
 * Refresh: npm run types:gen
 */

`;

const out = resolve(process.cwd(), "src/lib/types/database.generated.ts");
writeFileSync(out, header + body.types);
console.log(`✓ Wrote ${out} (${body.types.length} chars)`);

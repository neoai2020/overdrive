/**
 * Phase 2 smoke test — signs in as the seeded test user via @supabase/ssr,
 * then hits the new ad-detail + ads grid pages and asserts they render.
 *
 *   npx tsx scripts/e2e-phase2.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE = process.env.SITE_BASE ?? "http://localhost:3000";
const EMAIL = "andrew+test@overdrive.dev";
const PASS = "od-test-passw0rd!";

async function main() {
  // 1) Sign in with the SSR client so we get the cookie-shape it expects
  const cookieJar = new Map<string, string>();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })); },
      setAll(arr) { for (const c of arr) cookieJar.set(c.name, c.value); },
    },
  });
  const { error: signinErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (signinErr) throw signinErr;
  console.log("✓ signed in (cookies:", Array.from(cookieJar.keys()).join(", "), ")");

  const cookieHeader = Array.from(cookieJar.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");

  // 2) Find an ad to open
  const { data: ads } = await supabase
    .from("ads")
    .select("id, name")
    .limit(3);
  if (!ads || ads.length === 0) {
    console.error("No ads in workspace — run `npm run seed andrew+test@overdrive.dev` first");
    process.exit(1);
  }
  console.log(`✓ found ${ads.length} ads — testing first: ${ads[0].id}`);

  // 3) Hit /app, /app/ads, /app/ads/<id>
  const targets = [
    `${BASE}/app`,
    `${BASE}/app/ads`,
    `${BASE}/app/ads/${ads[0].id}`,
    `${BASE}/app/campaigns`,
  ];
  let allOk = true;
  for (const u of targets) {
    const res = await fetch(u, { headers: { cookie: cookieHeader }, redirect: "manual" });
    const text = await res.text();
    const ok = res.status === 200;
    const looksRight =
      text.includes("Overdrive") || text.includes("Generate") || text.includes("ad") || text.includes("campaign");
    const flag = ok && looksRight ? "✓" : "✗";
    console.log(`${flag} ${u} → HTTP ${res.status} (${text.length} bytes)`);
    if (!ok) {
      allOk = false;
      console.log("    Body snippet:", text.slice(0, 200));
    }
  }
  if (!allOk) process.exit(1);
  console.log("✓ all routes 200");
}

main().catch((e) => { console.error(e); process.exit(1); });

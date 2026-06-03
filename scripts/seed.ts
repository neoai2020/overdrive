/**
 * Mock data seeder. Run after creating your first account.
 *
 *   npx tsx scripts/seed.ts <user_email>
 *
 * Creates: 6 offers, 4 campaigns, 11 ad sets, ~50 ads (with versions),
 * 5 voice files, 3 saved presets, and a Meta integration row for the
 * workspace owned by the given user.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

// Lightweight .env.local loader (avoids a dotenv dependency just for this script)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const email = process.argv[2];

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email) {
  console.error("Usage: tsx scripts/seed.ts <user_email>");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // Look up the auth user → profile → workspace
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  const user = users.users.find((u) => u.email === email);
  if (!user) throw new Error(`User ${email} not found. Sign up first via /auth/signup`);

  const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).single();
  if (!profile?.workspace_id) throw new Error(`No profile/workspace for ${email}`);
  const workspace_id = profile.workspace_id as string;

  console.log(`Seeding workspace ${workspace_id} for ${email}…`);

  // ─── OFFERS ──────────────────────────────────────────────────────────────
  const offerPayloads = [
    { name: "MetaLean 90", niche: "weight_loss", promise: "Burn belly fat in 90 days — without giving up bread", price_text: "$69 · VSL", url: "https://example.com/metalean" },
    { name: "ApexFx Signals", niche: "forex", promise: "Beginner-friendly forex signals · 3 winners a day", price_text: "$197/mo", url: "https://example.com/apexfx" },
    { name: "Skin Reset Serum", niche: "skincare", promise: "Visible wrinkle reduction in 14 days, dermatologist-formulated", price_text: "$59 · 2x", url: "https://example.com/skinreset" },
    { name: "Solo CEO Method", niche: "biz_opp", promise: "Build a 1-person agency to $20k/mo in 90 days", price_text: "$497 · course", url: "https://example.com/solo" },
    { name: "Stoic Sleep Peptide", niche: "peptides", promise: "Deep REM sleep without grogginess — peptide stack", price_text: "$129 · 30 day", url: "https://example.com/stoic" },
    { name: "Range Crypto Pro", niche: "crypto", promise: "Range-trade Ethereum like a pro — 3 setups, 2 hours/wk", price_text: "$297/mo", url: "https://example.com/range" },
  ].map((o) => ({
    ...o,
    workspace_id,
    last_researched_at: new Date().toISOString(),
    avatar: {
      age_range: "35–55", gender: "mixed",
      pain: "Plateaued after trying everything", triggers: ["just hit a number", "summer", "doctor's visit"],
    },
    angles: [
      { name: "I tried everything", summary: "Confession of failed solutions before this", confidence: 0.88 },
      { name: "Doctor authority", summary: "Clinical credibility frame", confidence: 0.81 },
      { name: "Before/after transformation", summary: "Visual contrast led", confidence: 0.74 },
    ],
    objections: [
      { text: "Is this a scam?", response_angle: "Show clinical study + ingredient transparency" },
      { text: "Will it work for me?", response_angle: "Testimonials matching the avatar age" },
    ],
  }));
  const { data: offers } = await supabase.from("offers").insert(offerPayloads).select("id, name, niche");
  if (!offers) throw new Error("offers insert failed");
  console.log(`  ✓ ${offers.length} offers`);

  // ─── CAMPAIGNS ───────────────────────────────────────────────────────────
  const campaignPayloads = [
    { name: "MetaLean · Cold · Q4", offer: offers[0], status: "live",       budget: 250, roas: 2.84, spend: 18420 },
    { name: "ApexFx · Broad Test",   offer: offers[1], status: "generating", budget: 150 },
    { name: "Skin Reset · Lookalikes", offer: offers[2], status: "draft",   budget: 120 },
    { name: "Solo CEO · Retargeting", offer: offers[3], status: "paused",   budget: 80, roas: 4.21, spend: 4810 },
  ];
  const { data: campaigns } = await supabase.from("campaigns").insert(
    campaignPayloads.map((c) => ({
      workspace_id,
      offer_id: c.offer.id,
      name: c.name,
      objective: "conversions",
      budget_type: "cbo",
      daily_budget: c.budget,
      bid_strategy: "highest_volume",
      status: c.status,
      spend: c.spend ?? null,
      roas: c.roas ?? null,
    }))
  ).select("id, name");
  if (!campaigns) throw new Error("campaigns insert failed");
  console.log(`  ✓ ${campaigns.length} campaigns`);

  // ─── AD SETS ─────────────────────────────────────────────────────────────
  const adSetSpec = [
    { campaign: campaigns[0], name: "Set 1 · Broad US 25-55", audience_type: "advantage_plus" },
    { campaign: campaigns[0], name: "Set 2 · LAL Purchasers 1%", audience_type: "lookalike" },
    { campaign: campaigns[0], name: "Set 3 · Weight loss interests", audience_type: "interests" },
    { campaign: campaigns[1], name: "Set 1 · Broad US", audience_type: "advantage_plus" },
    { campaign: campaigns[1], name: "Set 2 · Forex interests", audience_type: "interests" },
    { campaign: campaigns[2], name: "Set 1 · LAL Buyers 2%", audience_type: "lookalike" },
    { campaign: campaigns[2], name: "Set 2 · Anti-aging interests", audience_type: "interests" },
    { campaign: campaigns[2], name: "Set 3 · Broad Women 35+", audience_type: "advantage_plus" },
    { campaign: campaigns[3], name: "Set 1 · Web visitors 30d", audience_type: "custom" },
    { campaign: campaigns[3], name: "Set 2 · Engagers", audience_type: "custom" },
    { campaign: campaigns[3], name: "Set 3 · LAL Email list", audience_type: "lookalike" },
  ];
  const { data: adSets } = await supabase.from("ad_sets").insert(
    adSetSpec.map((s) => ({
      workspace_id,
      campaign_id: s.campaign.id,
      name: s.name,
      locations: ["United States"],
      age_min: 25, age_max: 55,
      audience_type: s.audience_type,
      placement_mode: "advantage_plus",
      status: "live",
    }))
  ).select("id, campaign_id, name");
  if (!adSets) throw new Error("ad_sets insert failed");
  console.log(`  ✓ ${adSets.length} ad sets`);

  // ─── BATCHES + ADS + VERSIONS ────────────────────────────────────────────
  const batchSpecs = [
    { offer: offers[0], angle: "I tried everything", size: 15, status: "ready" },
    { offer: offers[1], angle: "Doctor authority", size: 10, status: "ready" },
    { offer: offers[2], angle: "Before/after transformation", size: 12, status: "needs_review" },
    { offer: offers[3], angle: "I tried everything", size: 8, status: "generating", progress_step: "writing_scripts", progress_pct: 55 },
    { offer: offers[5], angle: "Doctor authority", size: 5, status: "ready" },
  ];

  let adCount = 0;
  for (const spec of batchSpecs) {
    const { data: batch } = await supabase.from("batches").insert({
      workspace_id, offer_id: spec.offer.id, angle: spec.angle,
      style_mix: ["ugc_talking_head", "b_roll_vo"], size: spec.size,
      run_mode: "autopilot", status: spec.status,
      progress_step: spec.progress_step ?? "complete",
      progress_pct: spec.progress_pct ?? 100,
      credits_spent: spec.size * 8,
      idempotency_key: nanoid(16),
      completed_at: spec.status === "ready" ? new Date().toISOString() : null,
    }).select("id").single();
    if (!batch) continue;

    if (spec.status !== "generating") {
      const adRows = Array.from({ length: spec.size }).map((_, i) => ({
        workspace_id, offer_id: spec.offer.id, batch_id: batch.id,
        name: `${spec.offer.name} · ${spec.angle} · ${i + 1}`,
        status: spec.status === "needs_review" ? "needs_review" : "ready",
      }));
      const { data: ads } = await supabase.from("ads").insert(adRows).select("id");
      if (ads) {
        adCount += ads.length;
        const versions = ads.map((a, i) => ({
          ad_id: a.id, version_number: 1,
          hook: mockHook(spec.offer.name, i),
          script: mockScript(spec.offer.name, spec.angle, i),
          style: i % 2 === 0 ? "ugc_talking_head" : "b_roll_vo",
          length_seconds: 20 + (i % 5) * 3,
          voice_id: "voice_001",
          talent_id: `talent_${(i % 6) + 1}`,
        }));
        await supabase.from("ad_versions").insert(versions);
      }
    }
  }
  console.log(`  ✓ ${batchSpecs.length} batches, ${adCount} ads`);

  // ─── VOICE FILES ─────────────────────────────────────────────────────────
  const voiceFiles = [
    { kind: "swipe", name: "Competitor swipes · weight loss · Q3.pdf", size_bytes: 1240000 },
    { kind: "script", name: "Hot Hook Winners Aug.docx", size_bytes: 86000 },
    { kind: "brand_voice", name: "Voice guidelines · MetaLean.md", size_bytes: 5400 },
    { kind: "transcript", name: "Customer call · Sarah F.txt", size_bytes: 22000 },
    { kind: "swipe", name: "Forex top 50 winning ads.pdf", size_bytes: 3200000 },
  ];
  await supabase.from("voice_files").insert(
    voiceFiles.map((v) => ({
      ...v, workspace_id,
      storage_path: `${workspace_id}/${v.name}`,
      mime_type: v.name.endsWith(".pdf") ? "application/pdf" : "text/plain",
    }))
  );
  console.log(`  ✓ ${voiceFiles.length} voice files`);

  // ─── PRESETS ─────────────────────────────────────────────────────────────
  const presets = [
    { name: "Quick 10 · UGC only", description: "Fast cold-traffic batch", config: { size: 10, style_mix: ["ugc_talking_head"], run_mode: "autopilot" } },
    { name: "Full-scale 30 · Mixed", description: "Hooks + B-roll + testimonials", config: { size: 30, style_mix: ["ugc_talking_head", "b_roll_vo", "testimonial"], run_mode: "review_checkpoints" } },
    { name: "5 hooks only", description: "Pattern interrupts for testing", config: { size: 5, style_mix: ["pattern_interrupt"], run_mode: "autopilot" } },
  ];
  await supabase.from("presets").insert(presets.map((p) => ({ ...p, workspace_id })));
  console.log(`  ✓ ${presets.length} presets`);

  console.log(`\nDone. Refresh /app to see the seeded workspace.`);
}

function mockHook(offerName: string, i: number) {
  const HOOKS = [
    "I was 47 lbs heavier 6 months ago — here's what changed",
    "Stop scrolling. This made me $4k last week.",
    "The 'doctor's secret' big pharma doesn't want you to see",
    "POV: you stop doing this one thing and the weight falls off",
    "Forget keto. This is what actually melts belly fat at 50.",
    "If your CPMs are over $30, you're doing this one thing wrong",
    "Watch what happens at 0:14 — you won't believe it",
    "My mom tried this for 30 days. The before/after is wild.",
    "I quit the gym and got leaner. Here's the unhinged truth.",
    "3 reasons why your last ad bombed (and how to fix it)",
  ];
  return HOOKS[(i + offerName.length) % HOOKS.length];
}
function mockScript(offerName: string, angle: string, i: number) {
  return `[Hook] ${mockHook(offerName, i)}\n\n[Beat 1] ${offerName} story setup.\n[Beat 2] Why everything else failed.\n[Beat 3] How ${angle.toLowerCase()} cracked it.\n[Beat 4] Proof + testimonial.\n[CTA] Tap to try it.`;
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });

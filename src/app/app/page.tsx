import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app-shell/page-shell";
import { HeroCreateBridge } from "@/components/app-shell/hero-create-bridge";
import { StatCard } from "@/components/ui/stat-card";
import { CampaignRow, CampaignRowHeader } from "@/components/campaign-row";
import { AdCard } from "@/components/ad-card";
import type { Campaign, Ad, AdVersion } from "@/lib/types/database";

export default async function HomePage() {
  const supabase = await createClient();

  let stats = { adsReady: 0, campaignsLive: 0, batchesActive: 0, creditsLeft: 100, pushed: 0, spend: 0 };
  let campaigns: (Campaign & { offer_name?: string | null })[] = [];
  let latestAds: (Ad & { current_version: AdVersion | null })[] = [];

  try {
    const [
      { count: adsReady },
      { count: pushed },
      { count: campaignsLive },
      { count: batchesActive },
      { data: ws },
      { data: campaignRows },
      { data: adRows },
    ] = await Promise.all([
      supabase.from("ads").select("*", { count: "exact", head: true }).eq("status", "ready"),
      supabase.from("ads").select("*", { count: "exact", head: true }).eq("status", "pushed"),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "live"),
      supabase.from("batches").select("*", { count: "exact", head: true }).in("status", ["generating", "queued", "needs_review"]),
      supabase.from("workspaces").select("credits_total, credits_used").limit(1).maybeSingle(),
      supabase.from("campaigns").select("*, offer:offers(name)").order("updated_at", { ascending: false }).limit(4),
      supabase
        .from("ads")
        .select("*, current_version:ad_versions!ads_current_version_fk(*)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const spendRow = await supabase.from("campaigns").select("spend").not("spend", "is", null);
    const totalSpend = (spendRow.data ?? []).reduce((s, r) => s + (Number(r.spend) || 0), 0);

    stats = {
      adsReady: adsReady ?? 0,
      pushed: pushed ?? 0,
      campaignsLive: campaignsLive ?? 0,
      batchesActive: batchesActive ?? 0,
      creditsLeft: ws ? (ws.credits_total ?? 0) - (ws.credits_used ?? 0) : 100,
      spend: totalSpend,
    };

    campaigns = ((campaignRows ?? []) as Array<Campaign & { offer: { name: string } | null }>).map((c) => ({
      ...c,
      offer_name: c.offer?.name ?? null,
    }));

    latestAds = (adRows ?? []) as (Ad & { current_version: AdVersion | null })[];
  } catch {
    // schema not applied yet
  }

  return (
    <PageShell>
      <HeroCreateBridge />

      <section className="mb-7 grid grid-cols-2 gap-[13px] md:grid-cols-4">
        <StatCard label="Ads generated" value={stats.adsReady} delta={{ value: `+${Math.min(stats.adsReady, 34)}` }} icon="▷" iconTone="a" />
        <StatCard label="Pushed to Meta" value={stats.pushed} delta={{ value: `+${Math.min(stats.pushed, 12)}` }} icon="◎" iconTone="b" />
        <StatCard label="Batches running" value={stats.batchesActive} delta={{ value: stats.batchesActive > 0 ? `${stats.batchesActive} live` : "idle" }} icon="⚡" iconTone="p" />
        <StatCard
          label="Tracked spend"
          value={stats.spend >= 1000 ? `$${Math.round(stats.spend / 1000)}k` : `$${stats.spend}`}
          delta={{ value: "3.4×" }}
          icon="◇"
          iconTone="g"
        />
      </section>

      <div className="sec-head">
        <h3>Active campaigns</h3>
        <Link href="/app/campaigns" className="link">View all →</Link>
      </div>
      <div className="ctable mb-7">
        {campaigns.length === 0 ? (
          <div className="px-[18px] py-10 text-center text-sm text-[color:var(--color-muted)]">
            No campaigns yet — hit <strong className="text-[color:var(--color-ink)]">+ New campaign</strong> to start.
          </div>
        ) : (
          <>
            <CampaignRowHeader compact />
            <ul>
              {campaigns.map((c) => (
                <li key={c.id}><CampaignRow campaign={c} compact /></li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="sec-head">
        <h3>Latest ads</h3>
        <Link href="/app/ads" className="link">Open library →</Link>
      </div>
      {latestAds.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[color:var(--color-line)] py-12 text-center text-sm text-[color:var(--color-muted)]">
          No ads yet. Generate your first batch from the hero above.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[13px] sm:grid-cols-4 lg:grid-cols-6">
          {latestAds.map((ad) => (
            <Link key={ad.id} href={`/app/ads/${ad.id}`}>
              <AdCard ad={ad} compact />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

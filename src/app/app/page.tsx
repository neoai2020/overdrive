import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TileCard } from "@/components/tile-card";
import { Button } from "@/components/ui/button";
import { DocCallout } from "@/components/ui/doc-callout";
import { Compass, Megaphone, Boxes, Plug, FlaskConical, Layers, Plus } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();

  // Pull a few light counts — tolerate missing schema gracefully
  let stats = { adsReady: 0, campaignsLive: 0, batchesActive: 0, creditsLeft: 100 };
  try {
    const [{ count: adsReady }, { count: campaignsLive }, { count: batchesActive }, { data: ws }] = await Promise.all([
      supabase.from("ads").select("*", { count: "exact", head: true }).eq("status", "ready"),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "live"),
      supabase.from("batches").select("*", { count: "exact", head: true }).in("status", ["generating", "queued", "needs_review"]),
      supabase.from("workspaces").select("credits_total, credits_used").limit(1).maybeSingle(),
    ]);
    stats = {
      adsReady: adsReady ?? 0,
      campaignsLive: campaignsLive ?? 0,
      batchesActive: batchesActive ?? 0,
      creditsLeft: ws ? (ws.credits_total ?? 0) - (ws.credits_used ?? 0) : 100,
    };
  } catch {
    // schema not applied yet
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Mission control"
        title="Welcome back"
        description="Your creative engine — research, generate, review, push to Meta. All from here."
        actions={
          <>
            <Button variant="secondary" asChild><Link href="/app/research">Research an offer</Link></Button>
            <Button asChild><Link href="/app/campaigns?new=1"><Plus className="w-4 h-4" /> New campaign</Link></Button>
          </>
        }
      />

      <DocCallout title="The fastest path">
        Connect Meta → research one offer → generate a 10-ad batch → review the winners → push to your ad set. Mock data is loaded so you can click through the full flow today.
      </DocCallout>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Credits left" value={stats.creditsLeft} accent="acid" hint={`of ${stats.creditsLeft + 0} total`} />
        <StatCard label="Live campaigns" value={stats.campaignsLive} accent="green" />
        <StatCard label="Ads ready" value={stats.adsReady} accent="blue" />
        <StatCard label="Runs in flight" value={stats.batchesActive} accent="amber" />
      </section>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">Start something</h2>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <TileCard icon={Compass} accent="acid" title="Research an offer" description="Drop a URL — get the buyer avatar, angles and objections in 60 seconds." href="/app/research" />
          <TileCard icon={Megaphone} accent="blue" title="Build a campaign" description="Spin up a Meta-ready campaign + ad set with the right targeting in three steps." href="/app/campaigns?new=1" />
          <TileCard icon={Boxes} accent="amber" title="Generate ads" description="50+ hyper-realistic UGC, b-roll and testimonial ads — built in bulk." href="/app/batches?new=1" />
          <TileCard icon={Layers} accent="violet" title="Browse your library" description="Every ad you've ever generated, filterable by status, angle and offer." href="/app/ads" />
          <TileCard icon={FlaskConical} accent="amber" title="Run a Lab test" description="Pit hooks, talents, edits and CTAs head-to-head before you spend." href="/app/lab" />
          <TileCard icon={Plug} accent="acid" title="Connect Meta" description="One-click OAuth. We push ads straight into your selected ad account." href="/app/integrations" />
        </div>
      </section>
    </div>
  );
}

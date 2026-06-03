import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui/status-pill";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineName, InlineNumber } from "@/components/inline-fields";
import { Layers, Boxes, ArrowUpRight } from "lucide-react";
import type { Campaign, AdSet } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let campaign: Campaign | null = null;
  let adSets: AdSet[] = [];
  try {
    const [c, s] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("ad_sets").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
    ]);
    campaign = (c.data ?? null) as Campaign | null;
    adSets = ((s.data ?? []) as AdSet[]);
  } catch { /* */ }

  if (!campaign) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <Link href="/app/campaigns" className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">← All campaigns</Link>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold mb-2">{campaign.objective.replace(/_/g, " ")}</div>
          <h1 className="font-display text-3xl md:text-4xl leading-none">
            <InlineName table="campaigns" id={campaign.id} value={campaign.name} />
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-2 max-w-2xl">
            {campaign.budget_type.toUpperCase()} · {campaign.bid_strategy.replace(/_/g, " ")} · <InlineNumber table="campaigns" id={campaign.id} column="daily_budget" value={campaign.daily_budget} /> / day
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={campaign.status} />
          <Button variant="secondary" asChild><Link href={`/app/batches?campaign=${campaign.id}&new=1`}>Generate ads</Link></Button>
        </div>
      </div>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Ad sets" value={adSets.length} accent="blue" />
        <StatCard label="Spend" value={campaign.spend ? formatCurrency(campaign.spend) : "—"} accent="acid" hint="this period" />
        <StatCard label="ROAS" value={campaign.roas ? `${campaign.roas.toFixed(2)}×` : "—"} accent={campaign.roas && campaign.roas > 2 ? "green" : "amber"} />
        <StatCard label="Daily budget" value={<InlineNumber table="campaigns" id={campaign.id} column="daily_budget" value={campaign.daily_budget} className="font-display text-4xl" />} accent="violet" />
      </section>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">Ad sets</h2>
        {adSets.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No ad sets in this campaign"
            description="Ad sets define your audience. Add one so you have a place to push ads into."
            action={<Button>Add ad set</Button>}
          />
        ) : (
          <div className="rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 divide-y divide-white/5">
            {adSets.map((a) => (
              <Link key={a.id} href={`/app/campaigns/${campaign!.id}/ad-sets/${a.id}`}
                className="grid grid-cols-12 items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-[color:var(--color-blue)]/10 inline-flex items-center justify-center shrink-0 border border-[color:var(--color-blue)]/20">
                    <Layers className="w-4 h-4 text-[color:var(--color-blue)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
                      Ages {a.age_min}–{a.age_max} · {a.locations.join(", ")}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-xs text-[color:var(--color-muted)] uppercase tracking-wider">{a.audience_type.replace(/_/g, " ")}</div>
                <div className="col-span-2 text-sm font-mono">{a.daily_budget ? formatCurrency(a.daily_budget) : <span className="text-[color:var(--color-faint)]">CBO</span>}</div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <StatusPill status={a.status} />
                  <ArrowUpRight className="w-4 h-4 text-[color:var(--color-faint)]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

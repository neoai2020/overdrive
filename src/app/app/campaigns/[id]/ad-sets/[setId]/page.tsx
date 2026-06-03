import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdsGrid } from "@/components/ads-grid";
import { InlineName, InlineNumber } from "@/components/inline-fields";
import { Layers, Plus } from "lucide-react";
import type { AdSet, Ad, AdVersion, AdPlacement } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AdSetDetail({ params }: { params: Promise<{ id: string; setId: string }> }) {
  const { id, setId } = await params;
  const supabase = await createClient();

  let adSet: AdSet | null = null;
  let placements: Array<AdPlacement & { ads: Ad & { current_version: AdVersion | null } }> = [];
  try {
    const [s, p] = await Promise.all([
      supabase.from("ad_sets").select("*").eq("id", setId).single(),
      supabase
        .from("ad_placements")
        .select("*, ads(*, current_version:ad_versions!ads_current_version_fk(*))")
        .eq("ad_set_id", setId),
    ]);
    adSet = (s.data ?? null) as AdSet | null;
    placements = (p.data ?? []) as typeof placements;
  } catch { /* */ }

  if (!adSet) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <Link href={`/app/campaigns/${id}`} className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">← Back to campaign</Link>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold mb-2">
            Ad set · {adSet.audience_type.replace(/_/g, " ")}
          </div>
          <h1 className="font-display text-3xl md:text-4xl leading-none">
            <InlineName table="ad_sets" id={adSet.id} value={adSet.name} />
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-2 max-w-2xl">
            Ages {adSet.age_min}–{adSet.age_max} · {adSet.locations.join(", ")} ·{" "}
            {adSet.placement_mode === "advantage_plus" ? "Advantage+ placements" : "Manual placements"}
            {adSet.daily_budget !== null && (
              <> · <InlineNumber table="ad_sets" id={adSet.id} column="daily_budget" value={adSet.daily_budget} /> / day</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={adSet.status} />
          <Button asChild><Link href={`/app/batches?adSet=${setId}&new=1`}><Plus className="w-4 h-4" /> Generate ads</Link></Button>
        </div>
      </div>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">Ads in this set ({placements.length})</h2>
        {placements.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No ads pushed here yet"
            description="Generate a batch and push the winners into this set, or assign existing ads from your library."
            action={<Button asChild><Link href={`/app/batches?adSet=${setId}&new=1`}>Generate ads</Link></Button>}
          />
        ) : (
          <AdsGrid ads={placements.map((p) => p.ads)} />
        )}
      </section>
    </div>
  );
}

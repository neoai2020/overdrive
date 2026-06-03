import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Compass, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Offer } from "@/lib/types/database";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const supabase = await createClient();
  let offers: Offer[] = [];
  try {
    const { data } = await supabase.from("offers").select("*").order("updated_at", { ascending: false });
    offers = (data ?? []) as Offer[];
  } catch { /* */ }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Discover"
        title="Offer research"
        description="Drop a URL — get buyer avatar, angles, and objections. Every campaign you build is anchored to an offer."
        actions={<Button>+ Research new offer</Button>}
      />

      <DocCallout title="One offer, many campaigns">
        Research outputs (avatar, angles, objections) live on the offer record. Every batch you run inherits them — change the offer and every downstream creative inherits the update.
      </DocCallout>

      {offers.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No offers researched"
          description="Paste a sales-page URL and we'll extract the avatar, 4 angles, top objections and competitor swipes."
          action={<Button>Research an offer</Button>}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <Link key={o.id} href={`/app/research/${o.id}`}
              className="rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 p-5 hover:border-white/20 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="font-semibold leading-tight">{o.name}</div>
                <ExternalLink className="w-4 h-4 text-[color:var(--color-faint)] group-hover:text-[color:var(--color-ink)]" />
              </div>
              {o.niche && <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-acid)] mb-2 font-medium">{o.niche.replace(/_/g, " ")}</div>}
              {o.promise && <div className="text-xs text-[color:var(--color-muted)] line-clamp-2 mb-3 leading-relaxed">{o.promise}</div>}
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">
                <span>{Array.isArray(o.angles) ? `${(o.angles as unknown[]).length} angles` : "no angles"}</span>
                <span>{o.last_researched_at ? formatRelativeTime(o.last_researched_at) : "never"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { EmptyState } from "@/components/ui/empty-state";
import { AdsGrid } from "@/components/ads-grid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import type { Ad, AdVersion } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const supabase = await createClient();
  let ads: Array<Ad & { current_version: AdVersion | null }> = [];
  try {
    const { data } = await supabase
      .from("ads")
      .select("*, current_version:ad_versions!ads_current_version_fk(*)")
      .order("created_at", { ascending: false })
      .limit(60);
    ads = (data ?? []) as typeof ads;
  } catch { /* */ }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Library"
        title="All ads"
        description="Every creative you've ever generated. Click to preview. Shift-click to bulk-select."
        actions={<Button asChild><Link href="/app/batches?new=1"><Plus className="w-4 h-4" /> New batch</Link></Button>}
      />

      <DocCallout title="Keyboard shortcuts">
        Press <kbd className="font-mono text-[color:var(--color-acid)] bg-white/5 px-1 rounded">j</kbd> / <kbd className="font-mono text-[color:var(--color-acid)] bg-white/5 px-1 rounded">k</kbd> to navigate, <kbd className="font-mono text-[color:var(--color-acid)] bg-white/5 px-1 rounded">x</kbd> to toggle select, <kbd className="font-mono text-[color:var(--color-acid)] bg-white/5 px-1 rounded">enter</kbd> to open. Shift-click any card to select a range. The toolbar below shows what you can do with a selection.
      </DocCallout>

      {ads.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No ads yet"
          description="Run your first batch and we'll fill this grid with hyper-realistic UGC, b-roll and testimonial creatives."
          action={<Button asChild><Link href="/app/batches?new=1">Generate ads</Link></Button>}
        />
      ) : (
        <AdsGrid ads={ads} />
      )}
    </div>
  );
}

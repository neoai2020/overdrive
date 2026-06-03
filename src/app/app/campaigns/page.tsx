import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app-shell/page-shell";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CampaignRow, CampaignRowHeader } from "@/components/campaign-row";
import { CampaignBuilderTrigger } from "@/components/wizards/campaign-builder-trigger";
import { Megaphone, Plus } from "lucide-react";
import type { Campaign } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = await createClient();
  let campaigns: Campaign[] = [];
  try {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("updated_at", { ascending: false });
    campaigns = (data ?? []) as Campaign[];
  } catch { /* schema not applied */ }

  return (
    <PageShell>
      <PageHeader
        title="My Campaigns"
        description="Build a campaign, generate ads into its ad sets, push to Meta."
        actions={<CampaignBuilderTrigger><Button className="btn-proto-sm"><Plus className="w-4 h-4" /> New campaign</Button></CampaignBuilderTrigger>}
      />

      <DocCallout title="Mental model">
        <strong>Offer → Campaign → Ad Set → Ad.</strong> An offer is the product. A campaign holds its targeting strategy. Ad sets are the audiences. Ads are the creative — and a single ad can live in multiple ad sets at once.
      </DocCallout>

      <div className="ctable">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Spin up your first campaign — three steps, one minute. We'll generate a starter ad set you can fill with ads."
            action={<CampaignBuilderTrigger><Button>Create campaign</Button></CampaignBuilderTrigger>}
          />
        ) : (
          <>
            <CampaignRowHeader />
            <ul>
              {campaigns.map((c) => (
                <li key={c.id}><CampaignRow campaign={c} /></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PageShell>
  );
}

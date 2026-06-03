import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Plug, ExternalLink } from "lucide-react";
import type { Integration } from "@/lib/types/database";

export const dynamic = "force-dynamic";

interface ProviderRow { id: "meta" | "tiktok"; label: string; desc: string; soon?: boolean }
const PROVIDERS: ProviderRow[] = [
  { id: "meta", label: "Meta Ads", desc: "Push ad sets and creatives straight into your Meta Ads Manager." },
  { id: "tiktok", label: "TikTok Ads", desc: "Coming in Phase 2 — same creatives, native TikTok placements.", soon: true },
];

export default async function IntegrationsPage() {
  const supabase = await createClient();
  let integrations: Integration[] = [];
  try {
    const { data } = await supabase.from("integrations").select("*");
    integrations = (data ?? []) as Integration[];
  } catch { /* */ }

  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="Connect the platforms we push ads into. Today: Meta. Soon: TikTok."
      />

      <DocCallout title="What gets stored">
        We store OAuth tokens in the integration record, scoped to the ad account you pick during connect. Tokens are encrypted at rest via Supabase Vault and never sent to the client.
      </DocCallout>

      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const existing = byProvider.get(p.id);
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 inline-flex items-center justify-center shrink-0">
                  <Plug className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    {p.label}
                    {existing && <StatusPill status={existing.status === "connected" ? "live" : "failed"} />}
                    {p.soon && <span className="text-[9px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-[color:var(--color-faint)]">Soon</span>}
                  </CardTitle>
                  <CardDescription>{p.desc}</CardDescription>
                  {existing?.display_name && <div className="text-xs text-[color:var(--color-muted)] mt-2">{existing.display_name}</div>}
                </div>
                <div className="shrink-0">
                  {p.soon ? (
                    <Button variant="secondary" disabled>Notify me</Button>
                  ) : existing ? (
                    <Button variant="secondary">Manage</Button>
                  ) : (
                    <Button>Connect <ExternalLink className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

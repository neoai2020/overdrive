import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { GenerateWizardTrigger } from "@/components/wizards/generate-wizard-trigger";
import { Boxes, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Batch } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const supabase = await createClient();
  let batches: Batch[] = [];
  try {
    const { data } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    batches = (data ?? []) as Batch[];
  } catch { /* */ }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Generation runs"
        title="Batches"
        description="Each run produces 5–50 ads from one brief. Track progress, review the winners, push to ad sets."
        actions={<GenerateWizardTrigger><Button><Plus className="w-4 h-4" /> Generate ads</Button></GenerateWizardTrigger>}
      />

      <DocCallout title="Two modes">
        <strong className="text-[color:var(--color-ink)]">Autopilot</strong> runs the full pipeline end-to-end and surfaces the finished ads. <strong className="text-[color:var(--color-ink)]">Review checkpoints</strong> pauses between hooks → scripts → talent → final cut, so you can intervene before spend.
      </DocCallout>

      {batches.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No runs yet"
          description="Generate your first batch — pick an offer, pick an angle, pick a size, hit go."
          action={<GenerateWizardTrigger><Button>Generate ads</Button></GenerateWizardTrigger>}
        />
      ) : (
        <div className="rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 divide-y divide-white/5">
          {batches.map((b) => (
            <Link key={b.id} href={`/app/batches/${b.id}`} className="grid grid-cols-12 items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[color:var(--color-amber)]/10 inline-flex items-center justify-center shrink-0 border border-[color:var(--color-amber)]/20">
                  <Boxes className="w-4 h-4 text-[color:var(--color-amber)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{b.custom_angle ?? b.angle ?? "Mixed batch"}</div>
                  <div className="text-xs text-[color:var(--color-muted)] mt-0.5">{b.style_mix.map((s) => s.replace(/_/g, " ")).join(" · ")}</div>
                </div>
              </div>
              <div className="col-span-2 text-sm font-mono">{b.size} ads</div>
              <div className="col-span-2 text-sm text-[color:var(--color-muted)]">{b.run_mode.replace(/_/g, " ")}</div>
              <div className="col-span-2 text-xs text-[color:var(--color-faint)]">{formatRelativeTime(b.created_at)}</div>
              <div className="col-span-1 flex justify-end"><StatusPill status={b.status} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

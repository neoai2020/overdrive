import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { TemplateCard } from "@/components/template-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import type { Template } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  let templates: Template[] = [];
  try {
    const { data } = await supabase.from("templates").select("*").order("usage_count", { ascending: false });
    templates = (data ?? []) as Template[];
  } catch { /* */ }

  const system = templates.filter((t) => t.is_system);
  const custom = templates.filter((t) => !t.is_system);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Discover"
        title="Templates"
        description="Proven creative structures. Use one as a starting point for your batch."
      />

      <DocCallout title="System vs custom">
        System templates are battle-tested across thousands of winning ads. Custom templates are yours — save your winners and reuse them across offers.
      </DocCallout>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">System templates</h2>
        {system.length === 0 ? (
          <EmptyState icon={FileText} title="No system templates loaded" description="Run the seed migration to install the system template library." />
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {system.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-faint)] font-medium mb-3">Your templates</h2>
        {custom.length === 0 ? (
          <EmptyState icon={FileText} title="No custom templates yet" description="When you find a structure that wins, save it as a template and re-use it across offers." />
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {custom.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}

import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FlaskConical, Zap, GitCompareArrows } from "lucide-react";

export default function LabPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="My voice"
        title="Lab"
        description="Test variables head-to-head before you spend a dollar."
      />

      <DocCallout title="Three modes (Phase 2)">
        Pit creative levers against each other: hooks A/B/C, talents A/B, editing styles, CTAs. The Lab simulates view-through, hook retention and CTR using your historical performance to predict winners before launch.
      </DocCallout>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Zap, title: "Hook tournament", desc: "8 hooks → 1 winner. Same script, same talent." },
          { icon: GitCompareArrows, title: "A/B variant", desc: "Two complete creatives, side-by-side, predicted ROAS." },
          { icon: FlaskConical, title: "Style experiment", desc: "UGC vs B-roll vs Testimonial — across the same offer." },
        ].map((t) => (
          <Card key={t.title}>
            <CardHeader>
              <div className="w-9 h-9 rounded-md bg-[color:var(--color-acid)]/10 inline-flex items-center justify-center mb-3 border border-[color:var(--color-acid)]/20">
                <t.icon className="w-4 h-4 text-[color:var(--color-acid)]" />
              </div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" disabled>Coming soon</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmptyState
        icon={FlaskConical}
        title="Lab is in Pass 2"
        description="The data model already records every test in batches + ad_versions, so when the Lab ships in Phase 2, your historical generation becomes the training data."
      />
    </div>
  );
}

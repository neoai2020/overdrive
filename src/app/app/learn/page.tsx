import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DocCallout } from "@/components/ui/doc-callout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BookOpen, Megaphone, Layers, Compass, FileText, Boxes, ChevronRight } from "lucide-react";

const lessons = [
  { icon: Compass,  title: "How research works",     desc: "Avatar, angles, objections — what we extract and how to use it.", href: "/app/learn/research" },
  { icon: Megaphone,title: "Campaign architecture",  desc: "Offer → Campaign → Ad Set → Ad. The mental model.",                href: "/app/learn/architecture" },
  { icon: Boxes,    title: "Batches & the pipeline", desc: "Behind the scenes: hooks → scripts → talent → render.",            href: "/app/learn/pipeline" },
  { icon: Layers,   title: "Ads ↔ Ad sets",          desc: "Why one ad can live in many sets, and what that unlocks.",         href: "/app/learn/many-to-many" },
  { icon: FileText, title: "Templates vs presets",   desc: "Same words, different concepts. Don't conflate them.",             href: "/app/learn/templates" },
];

export default function LearnPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
      <PageHeader
        eyebrow="Learn"
        title="How Overdrive works"
        description="Concepts, mental models, and the why behind the design. Read once, build forever."
      />

      <DocCallout title="Doc-driven product">
        Every page has an inline doc callout (the green strip above). The Learn section is the long form — concept, diagram, gotchas, then a link straight to where you'd act on it.
      </DocCallout>

      <div className="grid gap-3">
        {lessons.map((l) => (
          <Link key={l.title} href={l.href}
            className="group rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 p-5 hover:border-white/20 transition-colors flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-[color:var(--color-acid)]/10 border border-[color:var(--color-acid)]/20 inline-flex items-center justify-center shrink-0">
              <l.icon className="w-4 h-4 text-[color:var(--color-acid)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{l.title}</div>
              <div className="text-sm text-[color:var(--color-muted)] mt-0.5">{l.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[color:var(--color-faint)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}

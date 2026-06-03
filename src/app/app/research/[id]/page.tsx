import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { Offer } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type AngleRow = { name: string; summary?: string; confidence?: number };
type ObjectionRow = { text: string; response_angle?: string };

export default async function OfferDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let offer: Offer | null = null;
  try {
    const { data } = await supabase.from("offers").select("*").eq("id", id).single();
    offer = (data ?? null) as Offer | null;
  } catch { /* */ }

  if (!offer) notFound();

  const angles = (Array.isArray(offer.angles) ? offer.angles : []) as AngleRow[];
  const objections = (Array.isArray(offer.objections) ? offer.objections : []) as ObjectionRow[];
  const avatar = (offer.avatar ?? {}) as Record<string, unknown>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <Link href="/app/research" className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">← All offers</Link>

      <PageHeader
        eyebrow={offer.niche?.replace(/_/g, " ") ?? "Offer"}
        title={offer.name}
        description={offer.promise ?? undefined}
        actions={
          <>
            <Button variant="secondary">Re-run research</Button>
            <Button asChild><Link href={`/app/batches?offer=${offer.id}&new=1`}>Generate ads</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader><CardTitle>Angles</CardTitle><CardDescription>The narratives that worked. Pick one when generating.</CardDescription></CardHeader>
            <CardContent>
              {angles.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted)]">No angles yet. Click "Re-run research" to discover them.</p>
              ) : (
                <ul className="divide-y divide-white/5 -mx-5">
                  {angles.map((a, i) => (
                    <li key={i} className="px-5 py-3 flex items-start gap-4">
                      <div className="font-mono text-[10px] text-[color:var(--color-faint)] mt-1">{String(i + 1).padStart(2, "0")}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{a.name}</div>
                        {a.summary && <div className="text-xs text-[color:var(--color-muted)] leading-relaxed mt-0.5">{a.summary}</div>}
                      </div>
                      {typeof a.confidence === "number" && (
                        <div className="text-xs font-mono shrink-0 text-[color:var(--color-acid)]">{Math.round(a.confidence * 100)}%</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Objections</CardTitle><CardDescription>What stops buyers — and how to disarm them in script.</CardDescription></CardHeader>
            <CardContent>
              {objections.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted)]">No objections logged yet.</p>
              ) : (
                <ul className="space-y-3">
                  {objections.map((o, i) => (
                    <li key={i} className="rounded-md border border-white/5 bg-white/[0.02] p-3">
                      <div className="text-sm font-medium">&ldquo;{o.text}&rdquo;</div>
                      {o.response_angle && <div className="text-xs text-[color:var(--color-muted)] mt-1.5">→ {o.response_angle}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Buyer avatar</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-3">
              {Object.entries(avatar).length === 0 && <p className="text-[color:var(--color-muted)]">Not yet researched.</p>}
              {Object.entries(avatar).map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)] mb-1">{k.replace(/_/g, " ")}</div>
                  <div className="text-[color:var(--color-ink)]">
                    {Array.isArray(v) ? <div className="flex flex-wrap gap-1.5">{v.map((x, i) => <Chip key={i}>{String(x)}</Chip>)}</div> : String(v)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {offer.url && (
            <Card>
              <CardHeader><CardTitle>Source</CardTitle></CardHeader>
              <CardContent>
                <a href={offer.url} target="_blank" rel="noreferrer" className="text-sm text-[color:var(--color-acid)] hover:underline break-all">{offer.url}</a>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

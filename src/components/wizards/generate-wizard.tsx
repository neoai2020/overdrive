"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { WizardShell, type WizardStep } from "@/components/wizard-shell";
import { Input, Label, Textarea } from "@/components/ui/input";
import { OptionList } from "@/components/ui/option-list";
import { Segmented } from "@/components/ui/segmented";
import { Chip } from "@/components/ui/chip";
import { generateBatch } from "@/lib/services";
import type { AdStyle, BatchRunMode, Offer } from "@/lib/types/database";

interface FormState {
  offerId: string | null;
  adSetId: string | null;     // optional scoped target
  angle: string;
  customAngle: string;
  styleMix: AdStyle[];
  size: number;
  runMode: BatchRunMode;
}

const STYLE_OPTIONS: ReadonlyArray<{ value: AdStyle; label: string; description: string }> = [
  { value: "ugc_talking_head", label: "UGC talking head", description: "Founder/customer to camera. Highest CTR for cold." },
  { value: "b_roll_vo", label: "B-roll + VO", description: "Visual cuts with voiceover. Best for proof-heavy claims." },
  { value: "testimonial", label: "Testimonial", description: "Customer story arc, transformation reveal." },
  { value: "before_after", label: "Before / after", description: "Visual contrast led. Skincare, fitness." },
  { value: "pattern_interrupt", label: "Pattern interrupt", description: "Hard hook, bold claim, short. Cold-traffic workhorse." },
];

export function GenerateWizard({
  open, onOpenChange, initialOfferId, initialAdSetId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialOfferId?: string;
  initialAdSetId?: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<FormState>({
    offerId: initialOfferId ?? null,
    adSetId: initialAdSetId ?? null,
    angle: "", customAngle: "",
    styleMix: ["ugc_talking_head"], size: 10, runMode: "autopilot",
  });

  React.useEffect(() => {
    if (open) {
      setState((s) => ({
        ...s,
        offerId: initialOfferId ?? s.offerId,
        adSetId: initialAdSetId ?? s.adSetId,
      }));
    }
  }, [open, initialOfferId, initialAdSetId]);

  const offersQ = useQuery({
    queryKey: ["offers", "for-wizard"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("offers").select("id, name, niche, promise, angles").order("updated_at", { ascending: false });
      return ((data ?? []) as Array<Pick<Offer, "id" | "name" | "niche" | "promise" | "angles">>);
    },
  });

  const offer = offersQ.data?.find((o) => o.id === state.offerId);
  const offerAngles = (Array.isArray(offer?.angles) ? offer!.angles : []) as Array<{ name: string; summary?: string; confidence?: number }>;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setState((s) => ({ ...s, [k]: v }));

  function toggleStyle(s: AdStyle) {
    setState((prev) => {
      const has = prev.styleMix.includes(s);
      const next = has ? prev.styleMix.filter((x) => x !== s) : [...prev.styleMix, s];
      return { ...prev, styleMix: next.length === 0 ? [s] : next };
    });
  }

  const steps: WizardStep[] = [
    {
      id: "offer",
      title: "Pick an offer",
      description: "Anchor the batch to one offer — its avatar, angles and objections feed every script.",
      isValid: () => state.offerId !== null,
      render: () => (
        <div className="space-y-5">
          {offersQ.data && offersQ.data.length > 0 ? (
            <OptionList
              value={state.offerId ?? ""}
              onChange={(v) => set("offerId", v || null)}
              options={offersQ.data.map((o) => ({
                value: o.id, label: o.name,
                description: o.promise ?? undefined,
                meta: o.niche ?? undefined,
              }))}
            />
          ) : (
            <div className="text-sm text-[color:var(--color-muted)] rounded-md border border-white/10 px-4 py-6 text-center">
              No offers yet. Add one in <span className="text-[color:var(--color-acid)]">Research</span> first.
            </div>
          )}
        </div>
      ),
    },
    {
      id: "angle",
      title: "Choose an angle",
      description: "Pick one of the researched angles or write a custom one.",
      isValid: () => state.angle.length > 0 || state.customAngle.trim().length > 5,
      render: () => (
        <div className="space-y-5">
          {offerAngles.length > 0 && (
            <div>
              <Label>Researched angles</Label>
              <OptionList
                value={state.angle}
                onChange={(v) => set("angle", v)}
                options={offerAngles.map((a) => ({
                  value: a.name, label: a.name,
                  description: a.summary,
                  meta: typeof a.confidence === "number" ? `${Math.round(a.confidence * 100)}%` : undefined,
                }))}
              />
            </div>
          )}
          <div>
            <Label>Or write your own</Label>
            <Textarea rows={3} value={state.customAngle} onChange={(e) => set("customAngle", e.target.value)} placeholder="Frame the GLP-1 mechanism as a 'metabolic reset' aimed at women 45+ who plateaued on traditional diets…" />
          </div>
        </div>
      ),
    },
    {
      id: "creative",
      title: "Styles & quantity",
      description: "Mix styles — we'll spread your batch evenly across them.",
      isValid: () => state.styleMix.length > 0 && state.size > 0,
      render: () => (
        <div className="space-y-5">
          <div>
            <Label>Style mix</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {state.styleMix.map((s) => (
                <Chip key={s} variant="acid" onRemove={state.styleMix.length > 1 ? () => toggleStyle(s) : undefined}>
                  {s.replace(/_/g, " ")}
                </Chip>
              ))}
            </div>
            <div className="grid gap-2">
              {STYLE_OPTIONS.filter((opt) => !state.styleMix.includes(opt.value)).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStyle(opt.value)}
                  className="text-left rounded-md border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] p-3"
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-[color:var(--color-muted)] mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Batch size — {state.size} ads</Label>
            <input
              type="range"
              min={5} max={50} step={5}
              value={state.size}
              onChange={(e) => set("size", Number(e.target.value))}
              className="w-full accent-[color:var(--color-acid)]"
            />
            <div className="flex justify-between text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider mt-1.5">
              <span>5</span><span>20</span><span>50</span>
            </div>
            <div className="text-xs text-[color:var(--color-muted)] mt-2">
              Estimated credits: <span className="font-mono text-[color:var(--color-ink)]">{state.size * 8}</span> · Estimated time: <span className="font-mono text-[color:var(--color-ink)]">~{Math.ceil(state.size * 0.4)} min</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "review",
      title: "Run mode & launch",
      description: "Autopilot finishes everything. Review checkpoints pause between stages.",
      isValid: () => true,
      render: () => (
        <div className="space-y-5">
          <div>
            <Label>Mode</Label>
            <OptionList
              value={state.runMode}
              onChange={(v) => set("runMode", v)}
              options={[
                { value: "autopilot", label: "Autopilot", description: "Run end-to-end. Wake up to a full batch of finished ads." },
                { value: "review_checkpoints", label: "Review checkpoints", description: "Pause between hooks → scripts → talent → render. Approve at each step." },
              ]}
            />
          </div>

          <div className="rounded-lg border border-[color:var(--color-acid)]/20 bg-[color:var(--color-acid)]/[0.04] p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold">Summary</div>
            <ul className="text-sm space-y-1.5">
              <li className="flex justify-between"><span className="text-[color:var(--color-muted)]">Offer</span><span className="font-medium">{offer?.name ?? "—"}</span></li>
              <li className="flex justify-between"><span className="text-[color:var(--color-muted)]">Angle</span><span className="font-medium truncate ml-2">{state.angle || state.customAngle.slice(0, 60) + (state.customAngle.length > 60 ? "…" : "")}</span></li>
              <li className="flex justify-between"><span className="text-[color:var(--color-muted)]">Styles</span><span className="font-medium">{state.styleMix.length}</span></li>
              <li className="flex justify-between"><span className="text-[color:var(--color-muted)]">Ads</span><span className="font-mono font-medium">{state.size}</span></li>
              <li className="flex justify-between"><span className="text-[color:var(--color-muted)]">Credits</span><span className="font-mono font-medium">{state.size * 8}</span></li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  async function onComplete() {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles").select("workspace_id").maybeSingle();
      if (!profile?.workspace_id) throw new Error("No workspace");

      const { batchId } = await generateBatch({
        workspaceId: profile.workspace_id,
        offerId: state.offerId ?? undefined,
        scopedAdSetId: state.adSetId ?? undefined,
        angle: state.angle || undefined,
        customAngle: state.customAngle || undefined,
        styleMix: state.styleMix,
        size: state.size,
        runMode: state.runMode,
      });

      toast.success("Batch queued — watch it run");
      onOpenChange(false);
      router.push(`/app/batches/${batchId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start batch";
      toast.error(msg);
    }
  }

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      title="Generate ads"
      steps={steps}
      onComplete={onComplete}
      finishLabel={`Launch · ${state.size * 8} credits`}
    />
  );
}

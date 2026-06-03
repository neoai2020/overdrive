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
import type {
  CampaignObjective, CampaignBudgetType, CampaignBidStrategy,
  AdSetAudienceType, AdSetPlacementMode, Offer,
} from "@/lib/types/database";

interface FormState {
  name: string;
  offerId: string | null;
  objective: CampaignObjective;
  budgetType: CampaignBudgetType;
  dailyBudget: number;
  bidStrategy: CampaignBidStrategy;
  // Ad set step
  setName: string;
  ageMin: number;
  ageMax: number;
  audienceType: AdSetAudienceType;
  placementMode: AdSetPlacementMode;
  locations: string;
}

const DEFAULT_STATE: FormState = {
  name: "", offerId: null,
  objective: "conversions", budgetType: "cbo", dailyBudget: 100, bidStrategy: "highest_volume",
  setName: "Set 1 · Broad", ageMin: 25, ageMax: 55, audienceType: "advantage_plus",
  placementMode: "advantage_plus", locations: "United States",
};

export function CampaignBuilderWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [state, setState] = React.useState<FormState>(DEFAULT_STATE);

  React.useEffect(() => { if (open) setState(DEFAULT_STATE); }, [open]);

  const offersQ = useQuery({
    queryKey: ["offers", "for-wizard"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("offers").select("id, name, niche, promise").order("updated_at", { ascending: false });
      return ((data ?? []) as Pick<Offer, "id" | "name" | "niche" | "promise">[]);
    },
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setState((s) => ({ ...s, [k]: v }));

  const steps: WizardStep[] = [
    {
      id: "basics",
      title: "Campaign basics",
      description: "Name the campaign and anchor it to an offer.",
      isValid: () => state.name.trim().length > 1 && state.offerId !== null,
      render: () => (
        <div className="space-y-5 max-w-2xl">
          <div>
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" value={state.name} onChange={(e) => set("name", e.target.value)} placeholder="Q4 Hot Take · Cold Traffic · v2" />
          </div>
          <div>
            <Label>Offer</Label>
            {offersQ.isLoading ? (
              <div className="text-xs text-[color:var(--color-muted)]">Loading offers…</div>
            ) : offersQ.data && offersQ.data.length > 0 ? (
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
              <div className="text-xs text-[color:var(--color-muted)] rounded-md border border-white/10 px-4 py-6 text-center">
                No offers yet. Create one in <span className="text-[color:var(--color-acid)]">Research</span> first.
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "settings",
      title: "Objective & budget",
      description: "How Meta optimizes and how much you spend per day.",
      isValid: () => state.dailyBudget > 0,
      render: () => (
        <div className="space-y-5 max-w-2xl">
          <div>
            <Label>Objective</Label>
            <OptionList
              value={state.objective}
              onChange={(v) => set("objective", v)}
              options={[
                { value: "conversions", label: "Conversions", description: "Optimize for purchases or sign-ups." },
                { value: "leads", label: "Leads", description: "Capture lead info via instant forms." },
                { value: "traffic", label: "Traffic", description: "Drive clicks to a landing page." },
                { value: "engagement", label: "Engagement", description: "Reach + interaction. Usually for retargeting." },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget mode</Label>
              <Segmented
                value={state.budgetType}
                onChange={(v) => set("budgetType", v)}
                options={[{ value: "cbo", label: "CBO" }, { value: "abo", label: "ABO" }]}
              />
              <p className="text-[10px] text-[color:var(--color-faint)] mt-2 uppercase tracking-wider">{state.budgetType === "cbo" ? "Campaign-level budget" : "Ad-set-level budget"}</p>
            </div>
            <div>
              <Label>Daily budget ($)</Label>
              <Input type="number" min={5} value={state.dailyBudget} onChange={(e) => set("dailyBudget", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Bid strategy</Label>
            <Segmented
              value={state.bidStrategy}
              onChange={(v) => set("bidStrategy", v)}
              options={[
                { value: "highest_volume", label: "Highest volume" },
                { value: "cost_cap", label: "Cost cap" },
                { value: "roas_goal", label: "ROAS goal" },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: "adset",
      title: "First ad set",
      description: "We'll create one ad set inside this campaign so you can start filling it with ads.",
      isValid: () => state.setName.trim().length > 1 && state.ageMin < state.ageMax,
      render: () => (
        <div className="space-y-5 max-w-2xl">
          <div>
            <Label>Set name</Label>
            <Input value={state.setName} onChange={(e) => set("setName", e.target.value)} />
          </div>
          <div>
            <Label>Audience type</Label>
            <Segmented
              value={state.audienceType}
              onChange={(v) => set("audienceType", v)}
              options={[
                { value: "advantage_plus", label: "Advantage+" },
                { value: "lookalike", label: "Lookalike" },
                { value: "interests", label: "Interests" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Age min</Label><Input type="number" min={18} max={64} value={state.ageMin} onChange={(e) => set("ageMin", Number(e.target.value))} /></div>
            <div><Label>Age max</Label><Input type="number" min={18} max={65} value={state.ageMax} onChange={(e) => set("ageMax", Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Locations</Label>
            <Textarea rows={2} value={state.locations} onChange={(e) => set("locations", e.target.value)} placeholder="United States, Canada" />
            <p className="text-[10px] text-[color:var(--color-faint)] mt-1.5 uppercase tracking-wider">Comma-separated</p>
          </div>
          <div>
            <Label>Placements</Label>
            <Segmented
              value={state.placementMode}
              onChange={(v) => set("placementMode", v)}
              options={[
                { value: "advantage_plus", label: "Advantage+ placements" },
                { value: "manual", label: "Manual" },
              ]}
            />
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

      const { data: campaign, error } = await supabase.from("campaigns").insert({
        workspace_id: profile.workspace_id,
        offer_id: state.offerId,
        name: state.name,
        objective: state.objective,
        budget_type: state.budgetType,
        daily_budget: state.dailyBudget,
        bid_strategy: state.bidStrategy,
        status: "draft",
      }).select("id").single();

      if (error) throw error;

      // Create the first ad set
      const locations = state.locations.split(",").map((s) => s.trim()).filter(Boolean);
      await supabase.from("ad_sets").insert({
        workspace_id: profile.workspace_id,
        campaign_id: campaign.id,
        name: state.setName,
        locations,
        age_min: state.ageMin,
        age_max: state.ageMax,
        audience_type: state.audienceType,
        placement_mode: state.placementMode,
        status: "draft",
      });

      toast.success("Campaign created");
      onOpenChange(false);
      router.push(`/app/campaigns/${campaign.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(msg);
    }
  }

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      title="New campaign"
      steps={steps}
      onComplete={onComplete}
      finishLabel="Create campaign"
    />
  );
}

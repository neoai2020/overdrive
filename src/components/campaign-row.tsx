import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import type { Campaign } from "@/lib/types/database";
import { Megaphone } from "lucide-react";

interface CampaignRowProps {
  campaign: Campaign & { ad_set_count?: number; ad_count?: number };
}

export function CampaignRow({ campaign }: CampaignRowProps) {
  return (
    <Link
      href={`/app/campaigns/${campaign.id}`}
      className="group grid grid-cols-12 items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
    >
      <div className="col-span-5 flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md bg-[color:var(--color-acid)]/10 inline-flex items-center justify-center shrink-0 border border-[color:var(--color-acid)]/20">
          <Megaphone className="w-4 h-4 text-[color:var(--color-acid)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{campaign.name}</div>
          <div className="text-xs text-[color:var(--color-faint)] uppercase tracking-wider mt-0.5">
            {campaign.objective.replace(/_/g, " ")} · {campaign.budget_type.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="col-span-2 text-sm">
        <div className="text-[color:var(--color-ink)] font-mono">{formatCurrency(campaign.daily_budget)}</div>
        <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">daily</div>
      </div>

      <div className="col-span-1 text-sm text-[color:var(--color-muted)]">
        <span className="font-mono">{campaign.ad_set_count ?? 0}</span>
        <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">ad sets</div>
      </div>

      <div className="col-span-1 text-sm text-[color:var(--color-muted)]">
        <span className="font-mono">{campaign.ad_count ?? 0}</span>
        <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">ads</div>
      </div>

      <div className="col-span-2 text-sm">
        {campaign.spend != null ? (
          <>
            <div className="font-mono">{formatCurrency(campaign.spend)}</div>
            <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">
              {campaign.roas ? `${campaign.roas.toFixed(2)}× ROAS` : "spend"}
            </div>
          </>
        ) : (
          <span className="text-[color:var(--color-faint)]">—</span>
        )}
      </div>

      <div className="col-span-1 flex justify-end"><StatusPill status={campaign.status} /></div>
    </Link>
  );
}

export function CampaignRowHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-[color:var(--color-faint)] border-b border-white/8 font-medium">
      <div className="col-span-5">Campaign</div>
      <div className="col-span-2">Budget</div>
      <div className="col-span-1">Sets</div>
      <div className="col-span-1">Ads</div>
      <div className="col-span-2">Performance</div>
      <div className="col-span-1 text-right">Status</div>
    </div>
  );
}

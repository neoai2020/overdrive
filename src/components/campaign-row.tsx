import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import type { Campaign } from "@/lib/types/database";
import { ChevronRight } from "lucide-react";

interface CampaignRowProps {
  campaign: Campaign & { ad_set_count?: number; ad_count?: number; offer_name?: string | null };
  compact?: boolean;
}

export function CampaignRow({ campaign, compact }: CampaignRowProps) {
  return (
    <Link
      href={`/app/campaigns/${campaign.id}`}
      className={cn(
        "grid items-center gap-[14px] border-t border-[color:var(--color-line2)] px-[18px] py-[15px] transition-colors hover:bg-[color:var(--color-card2)]",
        compact
          ? "grid-cols-[2.4fr_1fr_1fr_1fr_1fr_36px]"
          : "grid-cols-12"
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-3", !compact && "col-span-5")}>
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-card3)] text-[17px]">
          📣
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-bold">{campaign.name}</div>
          <div className="mt-0.5 truncate font-mono text-[11.5px] text-[color:var(--color-faint)]">
            {campaign.offer_name ?? "Offer"} · {campaign.objective.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="col-span-2 text-sm">
            <div className="font-mono text-[color:var(--color-ink)]">{formatCurrency(campaign.daily_budget)}</div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">daily</div>
          </div>
          <div className="col-span-1 text-sm text-[color:var(--color-muted)]">
            <span className="font-mono">{campaign.ad_set_count ?? 0}</span>
          </div>
          <div className="col-span-1 text-sm text-[color:var(--color-muted)]">
            <span className="font-mono">{campaign.ad_count ?? 0}</span>
          </div>
          <div className="col-span-2 text-sm">
            {campaign.spend != null ? (
              <>
                <div className="font-mono">{formatCurrency(campaign.spend)}</div>
                <div className={cn("text-[10px] uppercase tracking-wider", campaign.roas ? "text-[color:var(--color-green)]" : "text-[color:var(--color-faint)]")}>
                  {campaign.roas ? `${campaign.roas.toFixed(1)}× ROAS` : "spend"}
                </div>
              </>
            ) : (
              <span className="text-[color:var(--color-faint)]">—</span>
            )}
          </div>
        </>
      )}

      {compact && (
        <>
          <div><StatusPill status={campaign.status} /></div>
          <div className="text-sm font-semibold">{campaign.ad_set_count ?? 0}</div>
          <div className="text-sm font-semibold">{campaign.ad_count ?? 0}</div>
          <div>
            {campaign.roas ? (
              <div className="text-[14px] font-semibold text-[color:var(--color-green)]">{campaign.roas.toFixed(1)}×</div>
            ) : (
              <div className="font-mono text-[11px] text-[color:var(--color-faint)]">Spend</div>
            )}
          </div>
        </>
      )}

      <div className={cn("text-right text-[color:var(--color-faint)]", !compact && "col-span-1 flex justify-end")}>
        {!compact && <StatusPill status={campaign.status} />}
        {compact && <ChevronRight className="ml-auto h-[18px] w-[18px]" />}
      </div>
    </Link>
  );
}

export function CampaignRowHeader({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-[2.4fr_1fr_1fr_1fr_1fr_36px] gap-[14px] px-[18px] py-[13px] font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-faint)]">
        <div>Campaign</div>
        <div>Status</div>
        <div>Sets</div>
        <div>Ads</div>
        <div>ROAS</div>
        <div />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-[color:var(--color-faint)] font-medium">
      <div className="col-span-5">Campaign</div>
      <div className="col-span-2">Budget</div>
      <div className="col-span-1">Sets</div>
      <div className="col-span-1">Ads</div>
      <div className="col-span-2">Performance</div>
      <div className="col-span-1 text-right">Status</div>
    </div>
  );
}

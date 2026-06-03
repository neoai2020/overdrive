import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types/database";
import { FileText } from "lucide-react";

export function TemplateCard({ template, onClick }: { template: Template; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group rounded-lg border border-white/8 bg-[color:var(--color-card)]/70 p-5 text-left",
        "hover:border-[color:var(--color-acid)]/40 hover:bg-[color:var(--color-card2)]/80 transition-all"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-md bg-[color:var(--color-acid)]/10 border border-[color:var(--color-acid)]/20 inline-flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-[color:var(--color-acid)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-tight">{template.name}</div>
          {template.is_system && <div className="text-[9px] uppercase tracking-wider text-[color:var(--color-acid)]/70 mt-0.5 font-medium">System</div>}
        </div>
      </div>
      {template.summary && <p className="text-xs text-[color:var(--color-muted)] leading-relaxed line-clamp-3">{template.summary}</p>}
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">
        <span>{template.default_length ? `${template.default_length}s` : "—"}</span>
        <span>Used {template.usage_count}×</span>
      </div>
    </button>
  );
}

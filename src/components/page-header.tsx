import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Matches prototype `.ph` — body font headlines, not Anton display. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-[22px] flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-acid)]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[23px] font-extrabold tracking-[-0.01em]">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-[13.5px] text-[color:var(--color-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

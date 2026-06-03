import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-8", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl md:text-4xl leading-none">{title}</h1>
        {description && (
          <p className="text-sm text-[color:var(--color-muted)] mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

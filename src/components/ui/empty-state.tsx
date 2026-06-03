import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center",
      className
    )}>
      {Icon && (
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[color:var(--color-muted)]">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-[color:var(--color-muted)] max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}

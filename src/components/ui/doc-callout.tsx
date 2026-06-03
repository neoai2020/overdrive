import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface DocCalloutProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DocCallout({ title, children, className }: DocCalloutProps) {
  return (
    <div className={cn(
      "rounded-lg border-l-2 border-l-[color:var(--color-acid)] border border-white/8 bg-white/[0.02] px-5 py-4 flex gap-4",
      className
    )}>
      <div className="shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-[color:var(--color-acid)]/15 inline-flex items-center justify-center">
          <Info className="w-3.5 h-3.5 text-[color:var(--color-acid)]" />
        </div>
      </div>
      <div className="text-sm">
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-[color:var(--color-muted)] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

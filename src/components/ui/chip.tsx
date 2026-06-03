import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ChipProps {
  children: React.ReactNode;
  onRemove?: () => void;
  variant?: "default" | "acid";
  className?: string;
}

export function Chip({ children, onRemove, variant = "default", className }: ChipProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
      variant === "acid"
        ? "bg-[color:var(--color-acid)]/10 text-[color:var(--color-acid)] border-[color:var(--color-acid)]/30"
        : "bg-white/5 text-[color:var(--color-ink)] border-white/10",
      className
    )}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 -mr-1">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

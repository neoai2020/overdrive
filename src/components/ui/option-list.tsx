"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface OptionListProps<T extends string> {
  value: T | T[];
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; description?: string; meta?: string }>;
  multi?: boolean;
  className?: string;
}

export function OptionList<T extends string>({ value, onChange, options, multi = false, className }: OptionListProps<T>) {
  const isSelected = (v: T) => Array.isArray(value) ? value.includes(v) : value === v;

  return (
    <div className={cn("space-y-2", className)}>
      {options.map((opt) => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-full rounded-md border p-4 text-left transition-all",
              selected
                ? "border-[color:var(--color-acid)] bg-[color:var(--color-acid)]/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{opt.label}</div>
                {opt.description && (
                  <div className="text-xs text-[color:var(--color-muted)] mt-1 leading-relaxed">{opt.description}</div>
                )}
              </div>
              {opt.meta && <div className="text-xs text-[color:var(--color-faint)] shrink-0">{opt.meta}</div>}
              <div className={cn(
                "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center",
                selected
                  ? multi ? "bg-[color:var(--color-acid)] border-[color:var(--color-acid)]" : "border-[color:var(--color-acid)]"
                  : "border-white/20"
              )}>
                {selected && (
                  multi
                    ? <Check className="w-3 h-3 text-black" strokeWidth={3} />
                    : <div className="w-2 h-2 rounded-full bg-[color:var(--color-acid)]" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

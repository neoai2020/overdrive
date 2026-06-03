"use client";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, className }: SegmentedProps<T>) {
  return (
    <div className={cn("inline-flex rounded-md border border-white/10 bg-white/[0.03] p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 h-7 rounded-[5px] text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-[color:var(--color-acid)] text-black"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

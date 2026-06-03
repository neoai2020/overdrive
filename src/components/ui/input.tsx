import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm",
        "placeholder:text-[color:var(--color-faint)]",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-acid)]/40 focus:border-[color:var(--color-acid)]/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm min-h-[80px]",
        "placeholder:text-[color:var(--color-faint)]",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-acid)]/40 focus:border-[color:var(--color-acid)]/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors resize-y",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-xs font-medium text-[color:var(--color-muted)] uppercase tracking-wider mb-1.5", className)}>
      {children}
    </label>
  );
}

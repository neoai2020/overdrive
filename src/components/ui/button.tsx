"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-acid)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]",
  {
    variants: {
      variant: {
        primary: "bg-[color:var(--color-acid)] text-black hover:bg-[color:var(--color-acid)]/90 active:bg-[color:var(--color-acid)]/80 font-semibold",
        secondary: "bg-white/[0.06] text-[color:var(--color-ink)] border border-white/10 hover:bg-white/10 hover:border-white/20",
        ghost: "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-white/5",
        danger: "bg-[color:var(--color-hot)]/15 text-[color:var(--color-hot)] border border-[color:var(--color-hot)]/30 hover:bg-[color:var(--color-hot)]/25",
        link: "text-[color:var(--color-acid)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";

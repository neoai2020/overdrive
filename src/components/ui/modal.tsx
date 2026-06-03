"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;

interface ModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: "sm" | "md" | "lg" | "xl";
  hideClose?: boolean;
}

const sizeClass = {
  sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl",
};

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, children, size = "md", hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4",
        "border border-white/10 bg-[color:var(--color-card2)] shadow-2xl rounded-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        sizeClass[size],
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-white/5">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ModalContent.displayName = "ModalContent";

export function ModalHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b border-white/8", className)}>
      {children}
    </div>
  );
}

export const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
));
ModalTitle.displayName = "ModalTitle";

export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-[color:var(--color-muted)] mt-1", className)} {...props} />
));
ModalDescription.displayName = "ModalDescription";

export function ModalBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

export function ModalFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("px-6 py-4 border-t border-white/8 flex items-center justify-between gap-3", className)}>
      {children}
    </div>
  );
}

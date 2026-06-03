"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X, Check } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  render: () => React.ReactNode;
  /** Block "Next" until valid */
  isValid?: () => boolean;
}

interface WizardShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  /** label on the final action button */
  finishLabel?: string;
}

export function WizardShell({ open, onOpenChange, title, steps, onComplete, finishLabel = "Finish" }: WizardShellProps) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => { if (open) setStepIdx(0); }, [open]);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const canAdvance = step?.isValid?.() ?? true;

  async function next() {
    if (isLast) {
      setSubmitting(true);
      try { await onComplete(); }
      finally { setSubmitting(false); }
    } else {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    }
  }

  function back() { setStepIdx((i) => Math.max(0, i - 1)); }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl" hideClose className="grid grid-cols-[260px_1fr] p-0 overflow-hidden max-h-[88vh]">
        {/* Sidebar: progress rail */}
        <aside className="bg-[color:var(--color-card)]/60 border-r border-white/8 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold">{title}</div>
            <button onClick={() => onOpenChange(false)} className="rounded hover:bg-white/10 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = i < stepIdx;
              const current = i === stepIdx;
              return (
                <li key={s.id}>
                  <div className={cn(
                    "flex items-start gap-3 rounded-md px-2 py-2",
                    current && "bg-white/[0.04]"
                  )}>
                    <span className={cn(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono mt-0.5",
                      done
                        ? "bg-[color:var(--color-acid)] text-black"
                        : current
                          ? "border border-[color:var(--color-acid)] text-[color:var(--color-acid)]"
                          : "border border-white/15 text-[color:var(--color-faint)]"
                    )}>
                      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className={cn("text-xs font-semibold leading-tight", current ? "text-[color:var(--color-ink)]" : "text-[color:var(--color-muted)]")}>{s.title}</div>
                      {s.description && <div className="text-[10px] text-[color:var(--color-faint)] mt-0.5 leading-snug">{s.description}</div>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">Step {stepIdx + 1} of {steps.length}</div>
          </div>
        </aside>

        {/* Body */}
        <div className="flex flex-col min-h-0">
          <div className="px-7 py-6 border-b border-white/8">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold mb-2">Step {stepIdx + 1}</div>
            <h2 className="text-xl font-display tracking-tight">{step?.title}</h2>
            {step?.description && <p className="text-sm text-[color:var(--color-muted)] mt-1.5">{step.description}</p>}
          </div>
          <div className="flex-1 overflow-y-auto px-7 py-6">
            {step?.render()}
          </div>
          <div className="px-7 py-4 border-t border-white/8 flex items-center justify-between gap-3 bg-[color:var(--color-card)]/30">
            <Button variant="ghost" onClick={back} disabled={stepIdx === 0 || submitting}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={next} disabled={!canAdvance || submitting}>
              {submitting ? "Working…" : isLast ? finishLabel : "Continue"}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

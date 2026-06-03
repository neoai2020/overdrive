"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { InlineEdit } from "@/components/ui/inline-edit";
import { cn, formatCurrency } from "@/lib/utils";
import { Pencil } from "lucide-react";

/**
 * Inline-editable row fields backed by Supabase. Optimistic UX:
 * commit writes immediately, toast on success/failure, soft fallback on error.
 */

export function InlineName({
  table, id, value, className,
}: {
  table: "campaigns" | "ad_sets" | "offers" | "ads";
  id: string;
  value: string;
  className?: string;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (next: string) => {
      const supabase = createClient();
      const { error } = await supabase.from(table).update({ name: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Name updated"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  return (
    <InlineEdit
      value={value}
      onSave={(next) => mut.mutateAsync(next)}
      className={className}
      placeholder="Untitled"
    />
  );
}

export function InlineNumber({
  table, id, column, value, format = "currency", className,
}: {
  table: "campaigns" | "ad_sets";
  id: string;
  column: "daily_budget";
  value: number | null;
  format?: "currency" | "plain";
  className?: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value ?? ""));
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  React.useEffect(() => { setDraft(String(value ?? "")); }, [value]);

  const mut = useMutation({
    mutationFn: async (next: number) => {
      const supabase = createClient();
      const { error } = await supabase.from(table).update({ [column]: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function commit() {
    const num = Number(draft);
    if (!Number.isFinite(num) || num <= 0) { setEditing(false); setDraft(String(value ?? "")); return; }
    if (num === value) { setEditing(false); return; }
    await mut.mutateAsync(num);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number" min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setDraft(String(value ?? "")); }
        }}
        className={cn(
          "bg-white/[0.06] border border-[color:var(--color-acid)]/40 rounded px-2 py-0.5 outline-none w-24 font-mono text-sm",
          className
        )}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
      className={cn(
        "group inline-flex items-center gap-1.5 hover:bg-white/5 rounded px-1 -mx-1 py-0.5",
        className
      )}
    >
      <span className="font-mono">{format === "currency" ? formatCurrency(value ?? 0) : String(value ?? "—")}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

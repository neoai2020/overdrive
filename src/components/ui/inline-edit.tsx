"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  className?: string;
  placeholder?: string;
}

export function InlineEdit({ value, onSave, className, placeholder }: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  React.useEffect(() => { setDraft(value); }, [value]);

  async function commit() {
    if (draft.trim() === value || !draft.trim()) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try { await onSave(draft.trim()); }
    finally { setSaving(false); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        disabled={saving}
        placeholder={placeholder}
        className={cn("bg-white/[0.06] border border-[color:var(--color-acid)]/40 rounded px-2 py-0.5 outline-none w-full", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group inline-flex items-center gap-1.5 hover:bg-white/5 rounded px-1 -mx-1 py-0.5 text-left",
        className
      )}
    >
      <span>{value || <span className="text-[color:var(--color-faint)]">{placeholder}</span>}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";
import { PIPELINE_TASKS, TASK_LABEL, TASK_CAPABILITY, PROVIDERS_BY_CAPABILITY, MODELS_BY_PROVIDER } from "@/lib/pipeline/tasks";

type Row = {
  id: string;
  task: string;
  provider: string;
  model: string;
  params: Record<string, unknown>;
  weight: number;
  enabled: boolean;
  workspace_id: string | null;
  label: string | null;
};

export default function AdminModels() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "pipeline-config"],
    queryFn: async () => {
      const r = await fetch("/api/admin/pipeline-config");
      if (!r.ok) throw new Error("Failed to load");
      return (await r.json()) as { rows: Row[]; tasks: string[] };
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<Row>) => {
      const r = await fetch("/api/admin/pipeline-config", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pipeline-config"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/pipeline-config?id=${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pipeline-config"] }),
  });

  const [editing, setEditing] = React.useState<Partial<Row> | null>(null);

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="text-sm text-red-400">{(q.error as Error).message}</div>;

  // Group rows by task.
  const byTask = new Map<string, Row[]>();
  for (const r of q.data?.rows ?? []) {
    if (!byTask.has(r.task)) byTask.set(r.task, []);
    byTask.get(r.task)!.push(r);
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
        Multiple rows per task = weighted A/B split. The pipeline picks one row per call,
        weighted by <code>weight</code>. Default all-mock so the pipeline runs without keys —
        edit a row, change provider to <code>anthropic</code>/<code>google</code>/<code>elevenlabs</code>/<code>fal</code>/<code>higgsfield</code> to use real providers.
      </div>

      {PIPELINE_TASKS.map((task) => {
        const rows = byTask.get(task) ?? [];
        const totalWeight = rows.reduce((s, r) => s + (r.enabled ? r.weight : 0), 0);
        return (
          <div key={task} className="border rounded-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <div className="font-medium">{TASK_LABEL[task]}</div>
                <div className="text-xs text-muted-foreground">
                  task = <code>{task}</code> · capability = <code>{TASK_CAPABILITY[task]}</code> · {rows.length} config row{rows.length === 1 ? "" : "s"}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing({ task, provider: "mock", model: "mock-llm", params: {}, weight: 100, enabled: true, label: "" })}
              >
                + Add variant
              </Button>
            </div>
            <div className="divide-y">
              {rows.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">No config row. Pipeline will FAIL for this task — add one.</div>
              ) : rows.map((r) => (
                <div key={r.id} className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center text-sm">
                  <div>
                    <div className="font-mono text-xs">
                      <span className={r.enabled ? "" : "opacity-50 line-through"}>
                        {r.provider} / {r.model}
                      </span>
                      {r.label && <span className="ml-2 text-muted-foreground">[{r.label}]</span>}
                      {r.workspace_id && <span className="ml-2 text-xs text-amber-400">workspace-scoped</span>}
                    </div>
                    {Object.keys(r.params || {}).length > 0 && (
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        params: {JSON.stringify(r.params)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.enabled ? `${r.weight}% · ${Math.round((r.weight / Math.max(1, totalWeight)) * 100)}% effective` : "disabled"}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => upsert.mutate({ ...r, enabled: !r.enabled })}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Delete this config for ${task}?`) && remove.mutate(r.id)}>×</Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {editing && (
        <ConfigEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(row) => { upsert.mutate(row); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ConfigEditModal({ row, onClose, onSave }: { row: Partial<Row>; onClose: () => void; onSave: (r: Partial<Row>) => void }) {
  const [draft, setDraft] = React.useState<Partial<Row>>(row);
  const cap = TASK_CAPABILITY[draft.task as (typeof PIPELINE_TASKS)[number]];
  const providers = cap ? PROVIDERS_BY_CAPABILITY[cap] : [];
  const modelKey = draft.provider === "fal" && cap === "image" ? "fal-image" : draft.provider;
  const models = modelKey ? MODELS_BY_PROVIDER[modelKey] ?? [] : [];
  const [paramsText, setParamsText] = React.useState(JSON.stringify(draft.params ?? {}, null, 2));

  function commit() {
    let params: Record<string, unknown> = {};
    try { params = JSON.parse(paramsText); } catch { alert("Params must be valid JSON"); return; }
    onSave({ ...draft, params });
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>{draft.id ? "Edit variant" : "Add variant"}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
        <Field label="Provider">
          <select
            className="w-full bg-transparent border rounded-md h-9 px-2 text-sm"
            value={draft.provider ?? ""}
            onChange={(e) => setDraft({ ...draft, provider: e.target.value, model: "" })}
          >
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Model">
          <select
            className="w-full bg-transparent border rounded-md h-9 px-2 text-sm"
            value={draft.model ?? ""}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          >
            <option value="">— pick a model —</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="text-[11px] text-muted-foreground mt-1">
            Or type a custom model id below — provider must accept it.
          </div>
          <Input
            className="mt-1"
            placeholder="custom model id"
            value={draft.model ?? ""}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          />
        </Field>
        <Field label="Weight (0-100)">
          <Input
            type="number" min={0} max={100}
            value={draft.weight ?? 100}
            onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
          />
        </Field>
        <Field label="Label (optional)">
          <Input
            placeholder="e.g. primary, experiment-a"
            value={draft.label ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </Field>
        <Field label="Params (JSON)">
          <textarea
            className="w-full bg-transparent border rounded-md p-2 text-xs font-mono min-h-[120px]"
            value={paramsText}
            onChange={(e) => setParamsText(e.target.value)}
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            e.g. <code>{`{"temperature": 0.8, "max_tokens": 1024}`}</code> · for voiceover: <code>{`{"voice_id": "..."}`}</code>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.enabled ?? true}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          Enabled
        </label>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={commit}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

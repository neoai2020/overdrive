"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/modal";

type Row = {
  id: string;
  provider: string;
  label: string | null;
  last4: string;
  active: boolean;
  workspace_id: string | null;
  created_at: string;
  last_used_at: string | null;
};

const PROVIDERS = ["anthropic", "google", "openai", "elevenlabs", "fal", "higgsfield"];

export default function AdminKeys() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "provider-keys"],
    queryFn: async () => {
      const r = await fetch("/api/admin/provider-keys");
      if (!r.ok) throw new Error("Failed to load");
      return (await r.json()) as { rows: Row[] };
    },
  });

  const add = useMutation({
    mutationFn: async (body: { provider: string; label: string; apiKey: string }) => {
      const r = await fetch("/api/admin/provider-keys", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "provider-keys"] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await fetch(`/api/admin/provider-keys?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "provider-keys"] }),
  });

  const rotate = useMutation({
    mutationFn: async ({ id, apiKey }: { id: string; apiKey: string }) => {
      const r = await fetch(`/api/admin/provider-keys?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "provider-keys"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/provider-keys?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "provider-keys"] }),
  });

  const [adding, setAdding] = React.useState(false);
  const [rotating, setRotating] = React.useState<Row | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
        Keys are AES-256-GCM encrypted at rest using <code>PIPELINE_ENCRYPTION_KEY</code>. They never leave the server.
        The pipeline resolves <code>workspace key → global key → env var fallback</code>.
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>+ Add key</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Scope</th>
              <th className="px-4 py-2">Last used</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(q.data?.rows ?? []).length === 0 && !q.isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">No keys yet — providers fall back to env vars.</td></tr>
            )}
            {(q.data?.rows ?? []).map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-4 py-2 font-mono text-xs">{r.provider}</td>
                <td className="px-4 py-2">{r.label ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">••••{r.last4}</td>
                <td className="px-4 py-2 text-xs">{r.workspace_id ? "workspace" : "global"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "never"}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setRotating(r)}>Rotate</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: r.id, active: !r.active })}>
                    {r.active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Delete this ${r.provider} key?`) && remove.mutate(r.id)}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddKeyModal onClose={() => setAdding(false)} onSave={(b) => { add.mutate(b); setAdding(false); }} />}
      {rotating && <RotateKeyModal row={rotating} onClose={() => setRotating(null)} onSave={(apiKey) => { rotate.mutate({ id: rotating.id, apiKey }); setRotating(null); }} />}
    </div>
  );
}

function AddKeyModal({ onClose, onSave }: { onClose: () => void; onSave: (b: { provider: string; label: string; apiKey: string }) => void }) {
  const [provider, setProvider] = React.useState("anthropic");
  const [label, setLabel] = React.useState("primary");
  const [apiKey, setApiKey] = React.useState("");
  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent>
        <ModalHeader><ModalTitle>Add provider key</ModalTitle></ModalHeader>
        <ModalBody className="space-y-3">
          <label className="block text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Provider</div>
            <select className="w-full bg-transparent border rounded-md h-9 px-2 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Label</div>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="primary" />
          </label>
          <label className="block text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">API key</div>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_..." />
            <div className="text-[11px] text-muted-foreground mt-1">Encrypted before storage. You will not be able to view it again.</div>
          </label>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ provider, label, apiKey })} disabled={!apiKey}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function RotateKeyModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (apiKey: string) => void }) {
  const [apiKey, setApiKey] = React.useState("");
  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent>
        <ModalHeader><ModalTitle>Rotate {row.provider} key</ModalTitle></ModalHeader>
        <ModalBody>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="new key value" />
          <div className="text-[11px] text-muted-foreground mt-2">Replaces the encrypted blob. Old key is overwritten in place.</div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(apiKey)} disabled={!apiKey}>Rotate</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

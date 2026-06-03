"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIPELINE_TASKS, TASK_LABEL, TASK_CAPABILITY, PROVIDERS_BY_CAPABILITY, MODELS_BY_PROVIDER, type PipelineTask } from "@/lib/pipeline/tasks";

type Variant = { provider: string; model: string; params: string };

const EXAMPLE_INPUTS: Record<PipelineTask, string> = {
  understand_offer: JSON.stringify({ rawInput: "Glow24 Peptide Serum — $69 — promises smoother, plumper skin in 14 days without retinol irritation. 12-week clinical study showed 92% reported visible firmness." }, null, 2),
  generate_hooks: JSON.stringify({ brief: { product: "Glow24", promise: "Smoother skin in 14 days", avatar: { who: "Women 35-50", pain: "tried 6+ products" } }, angle: "pain", count: 6 }, null, 2),
  score_hooks: JSON.stringify({ brief: {}, candidates: [{ text: "Why your moisturizer stopped working at 40", style: "pattern_interrupt" }, { text: "Dermatologists hate this $69 peptide", style: "authority" }], topN: 1 }, null, 2),
  write_script: JSON.stringify({ brief: {}, hook: "Why your moisturizer stopped working at 40 — it's not what you think.", style: "ugc_talking_head", lengthSeconds: 27 }, null, 2),
  build_shotlist: JSON.stringify({ fullVoText: "Why your moisturizer stopped working at 40. I tried every serum. Then a derm friend told me about peptides.", wordTimings: [{ word: "Why", start: 0, end: 0.3 }, { word: "your", start: 0.3, end: 0.55 }], presenterName: "Hannah K." }, null, 2),
  voiceover: JSON.stringify({ text: "Hi, I'm Hannah. Two weeks ago I tried this serum and my skin has never looked better." }, null, 2),
  image: JSON.stringify({ prompt: "A woman in her 40s, soft smile, UGC selfie style, 9:16 portrait", aspectRatio: "9:16" }, null, 2),
  video: JSON.stringify({ prompt: "A woman talking to camera about skincare", durationSeconds: 5, aspectRatio: "9:16" }, null, 2),
};

export default function AdminTest() {
  const [task, setTask] = React.useState<PipelineTask>("generate_hooks");
  const [inputText, setInputText] = React.useState(EXAMPLE_INPUTS.generate_hooks);
  const [variants, setVariants] = React.useState<Variant[]>([
    { provider: "mock", model: "mock-llm", params: "{}" },
    { provider: "anthropic", model: "claude-sonnet-4-6", params: "{}" },
  ]);

  function setTaskAndInput(t: PipelineTask) {
    setTask(t);
    setInputText(EXAMPLE_INPUTS[t]);
    const cap = TASK_CAPABILITY[t];
    setVariants([
      { provider: "mock", model: cap === "llm" ? "mock-llm" : cap === "voice" ? "mock-voice" : cap === "image" ? "mock-image" : "mock-video", params: "{}" },
      ...variants.slice(1),
    ]);
  }

  const run = useMutation({
    mutationFn: async () => {
      let input: Record<string, unknown>;
      try { input = JSON.parse(inputText); } catch { throw new Error("Input must be valid JSON"); }
      const body = {
        task,
        input,
        variants: variants.map((v) => ({
          provider: v.provider,
          model: v.model,
          params: v.params ? JSON.parse(v.params || "{}") : {},
        })),
      };
      const r = await fetch("/api/admin/test-task", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      return (await r.json()) as { runId: string; variants: { provider: string; model: string; output: unknown; cost_usd: number; latency_ms: number; tokens?: { input?: number; output?: number }; error: string | null }[] };
    },
  });

  const cap = TASK_CAPABILITY[task];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
        Pick a task, set up two-or-more (provider, model, params) variants, and compare outputs side-by-side.
        Results are stored in <code>task_ab_runs</code> for later review.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left rail: task + input */}
        <div className="space-y-4">
          <label className="block text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Task</div>
            <select
              className="w-full bg-transparent border rounded-md h-9 px-2 text-sm"
              value={task}
              onChange={(e) => setTaskAndInput(e.target.value as PipelineTask)}
            >
              {PIPELINE_TASKS.map((t) => <option key={t} value={t}>{TASK_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Input (JSON)</div>
            <textarea
              className="w-full bg-transparent border rounded-md p-2 text-xs font-mono min-h-[300px]"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </label>
        </div>

        {/* Right: variants + results */}
        <div className="space-y-4">
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="border rounded-md p-3 grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end">
                <label className="text-xs">
                  <div className="text-muted-foreground mb-1">Provider</div>
                  <select className="w-full bg-transparent border rounded h-8 px-2" value={v.provider} onChange={(e) => {
                    const nv = [...variants]; nv[i] = { ...v, provider: e.target.value, model: "" }; setVariants(nv);
                  }}>
                    {PROVIDERS_BY_CAPABILITY[cap].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  <div className="text-muted-foreground mb-1">Model</div>
                  <select className="w-full bg-transparent border rounded h-8 px-2" value={v.model} onChange={(e) => {
                    const nv = [...variants]; nv[i] = { ...v, model: e.target.value }; setVariants(nv);
                  }}>
                    <option value="">— select —</option>
                    {(MODELS_BY_PROVIDER[v.provider === "fal" && cap === "image" ? "fal-image" : v.provider] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  <div className="text-muted-foreground mb-1">Params (JSON)</div>
                  <Input className="font-mono text-xs h-8" value={v.params} onChange={(e) => {
                    const nv = [...variants]; nv[i] = { ...v, params: e.target.value }; setVariants(nv);
                  }} />
                </label>
                {variants.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}>×</Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setVariants([...variants, { provider: "mock", model: "", params: "{}" }])}>
              + Add variant
            </Button>
          </div>

          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Running…" : "Run all variants"}
          </Button>

          {run.error && <div className="text-sm text-red-400">{(run.error as Error).message}</div>}

          {run.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {run.data.variants.map((r, i) => (
                <div key={i} className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground font-mono mb-1">{r.provider} / {r.model}</div>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    {r.latency_ms}ms · ${r.cost_usd.toFixed(4)}{r.tokens ? ` · ${r.tokens.input ?? "?"}in/${r.tokens.output ?? "?"}out` : ""}
                  </div>
                  {r.error ? (
                    <div className="text-xs text-red-400">{r.error}</div>
                  ) : (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-[500px] overflow-auto">{typeof r.output === "string" ? r.output : JSON.stringify(r.output, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

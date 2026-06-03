/**
 * POST /api/admin/test-task
 *
 * Body: {
 *   task: PipelineTask,
 *   variants: [{ provider, model, params? }],
 *   input: { ... task-specific shape ... }
 * }
 *
 * Runs the same input through every variant in parallel and writes a single
 * `task_ab_runs` row with all variants for side-by-side comparison in
 * /app/admin/test.
 *
 * For LLM tasks: input is { brief, hook?, angle?, ... } per the prompt files.
 * For voice/image/video: input is the request shape from src/lib/providers/types.ts.
 */

import { NextResponse } from "next/server";
import { assertAdmin, errorResponse } from "@/lib/server/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveExplicit } from "@/lib/providers/registry";
import { TASK_CAPABILITY, type PipelineTask } from "@/lib/pipeline/tasks";
import type {
  LLMProvider,
  VoiceProvider,
  ImageProvider,
  VideoProvider,
  LLMRequest,
  VoiceRequest,
  ImageRequest,
} from "@/lib/providers/types";
import * as understandOffer from "@/lib/prompts/understand-offer";
import * as generateHooks from "@/lib/prompts/generate-hooks";
import * as scoreHooks from "@/lib/prompts/score-hooks";
import * as writeScript from "@/lib/prompts/write-script";
import * as buildShotlist from "@/lib/prompts/build-shotlist";

type Variant = { provider: string; model: string; params?: Record<string, unknown> };

export async function POST(req: Request) {
  try {
    const { workspaceId, userId } = await assertAdmin();
    const body = await req.json() as {
      task: PipelineTask;
      variants: Variant[];
      input: Record<string, unknown>;
      offerId?: string;
    };
    const cap = TASK_CAPABILITY[body.task];
    if (!cap) return NextResponse.json({ error: `Unknown task ${body.task}` }, { status: 400 });
    if (!body.variants || body.variants.length === 0) {
      return NextResponse.json({ error: "Need at least one variant" }, { status: 400 });
    }

    const results = await Promise.all(body.variants.map(async (v) => {
      try {
        const start = Date.now();
        let output: unknown;
        let cost_usd = 0;
        let latency_ms = 0;
        let tokens: { input?: number; output?: number } | undefined;

        if (cap === "llm") {
          const { adapter } = await resolveExplicit<LLMProvider>("llm", v.provider, v.model, v.params ?? {}, workspaceId);
          const req = buildLLMRequest(body.task, body.input);
          const r = await adapter.complete(req);
          output = req.json ? r.json ?? r.text : r.text;
          cost_usd = r.cost_usd;
          latency_ms = r.latency_ms;
          tokens = r.tokens;
        } else if (cap === "voice") {
          const { adapter } = await resolveExplicit<VoiceProvider>("voice", v.provider, v.model, v.params ?? {}, workspaceId);
          const r = await adapter.synthesize(body.input as VoiceRequest);
          output = {
            durationSeconds: r.durationSeconds,
            wordTimings: r.wordTimings.slice(0, 30),
            audioBytes: r.audio.length,
          };
          cost_usd = r.cost_usd;
          latency_ms = r.latency_ms;
        } else if (cap === "image") {
          const { adapter } = await resolveExplicit<ImageProvider>("image", v.provider, v.model, v.params ?? {}, workspaceId);
          const r = await adapter.generate(body.input as ImageRequest);
          output = { imageUrl: r.imageUrl, bytes: r.imageBytes?.length };
          cost_usd = r.cost_usd;
          latency_ms = r.latency_ms;
        } else if (cap === "video") {
          // Video is async — only submit + return jobId; admin can re-poll.
          const { adapter } = await resolveExplicit<VideoProvider>("video", v.provider, v.model, v.params ?? {}, workspaceId);
          const sub = await adapter.submit(body.input as Parameters<VideoProvider["submit"]>[0]);
          output = { jobId: sub.jobId, status: "submitted (poll separately)" };
          latency_ms = Date.now() - start;
        }
        return { ...v, output, cost_usd, latency_ms, tokens, error: null };
      } catch (e) {
        return {
          ...v,
          output: null,
          cost_usd: 0,
          latency_ms: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }));

    const supabase = await createAdminClient();
    const { data: run, error } = await supabase
      .from("task_ab_runs")
      .insert({
        workspace_id: workspaceId,
        task: body.task,
        offer_id: body.offerId ?? null,
        input: body.input,
        variants: results,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ runId: run?.id, variants: results });
  } catch (e) { return errorResponse(e); }
}

function buildLLMRequest(task: PipelineTask, input: Record<string, unknown>): LLMRequest {
  switch (task) {
    case "understand_offer":
      return {
        messages: [
          { role: "system", content: understandOffer.SYSTEM },
          { role: "user", content: understandOffer.userPrompt({ rawInput: String(input.rawInput ?? "") }) },
        ],
        json: true,
      };
    case "generate_hooks":
      return {
        messages: [
          { role: "system", content: generateHooks.SYSTEM },
          { role: "user", content: generateHooks.userPrompt({ brief: input.brief ?? {}, angle: String(input.angle ?? "pain"), count: Number(input.count ?? 10) }) },
        ],
        json: true,
      };
    case "score_hooks":
      return {
        messages: [
          { role: "system", content: scoreHooks.SYSTEM },
          { role: "user", content: scoreHooks.userPrompt({ brief: input.brief ?? {}, candidates: (input.candidates as { text: string; style?: string }[]) ?? [], topN: Number(input.topN ?? 3) }) },
        ],
        json: true,
      };
    case "write_script":
      return {
        messages: [
          { role: "system", content: writeScript.SYSTEM },
          { role: "user", content: writeScript.userPrompt({ brief: input.brief ?? {}, hook: String(input.hook ?? ""), style: String(input.style ?? "ugc_talking_head"), lengthSeconds: Number(input.lengthSeconds ?? 27) }) },
        ],
        json: true,
      };
    case "build_shotlist":
      return {
        messages: [
          { role: "system", content: buildShotlist.SYSTEM },
          { role: "user", content: buildShotlist.userPrompt({ fullVoText: String(input.fullVoText ?? ""), wordTimings: (input.wordTimings as { word: string; start: number; end: number }[]) ?? [], presenterName: String(input.presenterName ?? "Presenter") }) },
        ],
        json: true,
      };
    default:
      throw new Error(`No LLM request builder for task ${task}`);
  }
}

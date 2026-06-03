/**
 * Admin: pipeline_config CRUD.
 *
 *   GET /api/admin/pipeline-config            → all rows (workspace + global)
 *   POST /api/admin/pipeline-config           → create/update a single row
 *     body: { id?, task, provider, model, params?, weight?, enabled?, label?, workspace_id? }
 *   DELETE /api/admin/pipeline-config?id=...
 */

import { NextResponse } from "next/server";
import { assertAdmin, errorResponse } from "@/lib/server/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { PIPELINE_TASKS } from "@/lib/pipeline/tasks";

export async function GET() {
  try {
    await assertAdmin();
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("pipeline_config")
      .select("*")
      .order("task", { ascending: true })
      .order("weight", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data, tasks: PIPELINE_TASKS });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
    const body = await req.json() as {
      id?: string;
      task: string;
      provider: string;
      model: string;
      params?: Record<string, unknown>;
      weight?: number;
      enabled?: boolean;
      label?: string;
      workspace_id?: string | null;
    };
    if (!PIPELINE_TASKS.includes(body.task as (typeof PIPELINE_TASKS)[number])) {
      return NextResponse.json({ error: `Unknown task ${body.task}` }, { status: 400 });
    }
    const supabase = await createAdminClient();
    const row = {
      task: body.task,
      provider: body.provider,
      model: body.model,
      params: body.params ?? {},
      weight: body.weight ?? 100,
      enabled: body.enabled ?? true,
      label: body.label ?? null,
      workspace_id: body.workspace_id ?? null,
    };
    if (body.id) {
      const { error } = await supabase.from("pipeline_config").update(row).eq("id", body.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("pipeline_config").insert(row);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    await assertAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const supabase = await createAdminClient();
    const { error } = await supabase.from("pipeline_config").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

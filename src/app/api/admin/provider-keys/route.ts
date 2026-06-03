/**
 * Admin: provider_keys CRUD with encryption.
 *
 *   GET    /api/admin/provider-keys         → masked list (provider, label, last4, active, last_used_at)
 *   POST   /api/admin/provider-keys         → add a key (encrypts plaintext)
 *     body: { provider, label?, apiKey, workspace_id? }
 *   PATCH  /api/admin/provider-keys?id=...  → rotate or toggle active
 *     body: { apiKey?, active? }
 *   DELETE /api/admin/provider-keys?id=...
 *
 * Plaintext keys NEVER leave the server. The admin sees `••••a3f2`.
 */

import { NextResponse } from "next/server";
import { assertAdmin, errorResponse } from "@/lib/server/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptString, last4Of } from "@/lib/server/encryption";

export async function GET() {
  try {
    await assertAdmin();
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("provider_keys")
      .select("id, provider, label, last4, active, workspace_id, created_at, last_used_at")
      .order("provider", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
    const body = await req.json() as {
      provider: string;
      label?: string;
      apiKey: string;
      workspace_id?: string | null;
    };
    if (!body.provider || !body.apiKey) {
      return NextResponse.json({ error: "provider and apiKey are required" }, { status: 400 });
    }
    const supabase = await createAdminClient();
    const encrypted = encryptString(body.apiKey);
    const { error } = await supabase.from("provider_keys").insert({
      provider: body.provider,
      label: body.label ?? "primary",
      key_encrypted: encrypted,
      last4: last4Of(body.apiKey),
      active: true,
      workspace_id: body.workspace_id ?? null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function PATCH(req: Request) {
  try {
    await assertAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const body = await req.json() as { apiKey?: string; active?: boolean };
    const supabase = await createAdminClient();
    const updates: Record<string, unknown> = {};
    if (typeof body.active === "boolean") updates.active = body.active;
    if (body.apiKey) {
      updates.key_encrypted = encryptString(body.apiKey);
      updates.last4 = last4Of(body.apiKey);
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "no updates" }, { status: 400 });
    }
    const { error } = await supabase.from("provider_keys").update(updates).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    await assertAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const supabase = await createAdminClient();
    const { error } = await supabase.from("provider_keys").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

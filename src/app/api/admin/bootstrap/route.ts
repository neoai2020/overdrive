/**
 * POST /api/admin/bootstrap
 *
 * Body: { secret: string }
 *
 * One-time bootstrap: if there are zero admins in the DB AND the caller is
 * authenticated AND the provided secret matches PIPELINE_BOOTSTRAP_SECRET,
 * promote the caller to admin. Designed for the first deploy; revoke by
 * unsetting the env var afterwards.
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { secret?: string };
  try { body = await req.json(); } catch { body = {}; }

  const expected = process.env.PIPELINE_BOOTSTRAP_SECRET;
  if (!expected) return NextResponse.json({ error: "Bootstrap disabled (no PIPELINE_BOOTSTRAP_SECRET set)" }, { status: 403 });
  if (body.secret !== expected) return NextResponse.json({ error: "Bad secret" }, { status: 403 });

  const admin = await createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Admin already exists. Promote via SQL." }, { status: 409 });
  }

  const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: "You are now an admin. Visit /app/admin to begin." });
}

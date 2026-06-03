/**
 * Defense-in-depth admin gate. Every admin handler calls this at the top —
 * RLS policies enforce the same on the DB side, but explicit beats implicit.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminContext = { userId: string; workspaceId: string };

export async function assertAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Not authenticated");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("workspace_id, is_admin")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new HttpError(403, "No profile");
  if (!profile.is_admin) throw new HttpError(403, "Admin only");
  return { userId: user.id, workspaceId: profile.workspace_id as string };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { "content-type": "application/json" } });
  }
  const msg = e instanceof Error ? e.message : String(e);
  return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "content-type": "application/json" } });
}

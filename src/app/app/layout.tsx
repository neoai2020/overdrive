import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShellFrame } from "@/components/app-shell/shell-frame";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  type ProfileLite = { full_name: string | null; avatar_url: string | null; workspace_id: string | null };
  let profile: ProfileLite | null = null;
  let creditsTotal = 2000;
  let creditsUsed = 0;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, workspace_id")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as ProfileLite | null) ?? null;

    if (profile?.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("credits_total, credits_used")
        .eq("id", profile.workspace_id)
        .maybeSingle();
      if (ws) {
        creditsTotal = ws.credits_total ?? 2000;
        creditsUsed = ws.credits_used ?? 0;
      }
    }
  } catch {
    profile = null;
  }

  return (
    <ShellFrame
      user={{
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      }}
      creditsTotal={creditsTotal}
      creditsUsed={creditsUsed}
    >
      {children}
    </ShellFrame>
  );
}

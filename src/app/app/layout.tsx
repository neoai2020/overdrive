import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShellFrame } from "@/components/app-shell/shell-frame";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Try to load profile (workspace context). Don't crash if schema isn't applied yet.
  type ProfileLite = { full_name: string | null; avatar_url: string | null };
  let profile: ProfileLite | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as ProfileLite | null) ?? null;
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
    >
      {children}
    </ShellFrame>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocCallout } from "@/components/ui/doc-callout";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let workspace: { name?: string; plan?: string; credits_total?: number; credits_used?: number } | null = null;
  try {
    const { data } = await supabase.from("workspaces").select("name, plan, credits_total, credits_used").limit(1).maybeSingle();
    workspace = data;
  } catch { /* */ }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[800px] mx-auto">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Workspace, billing, defaults, danger zone."
      />

      <DocCallout title="Workspaces in Phase 1">
        Every account gets one workspace, auto-provisioned at sign-up. Team support (multiple seats per workspace) ships in Pass 2 — the profiles + role columns already exist for it.
      </DocCallout>

      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle><CardDescription>The container for everything you do here.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" defaultValue={workspace?.name ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plan</Label>
              <div className="h-9 px-3 py-2 text-sm rounded-md border border-white/10 bg-white/[0.03] uppercase tracking-wider text-[color:var(--color-acid)] font-semibold">{workspace?.plan ?? "free"}</div>
            </div>
            <div>
              <Label>Credits</Label>
              <div className="h-9 px-3 py-2 text-sm rounded-md border border-white/10 bg-white/[0.03] font-mono">
                {(workspace?.credits_total ?? 0) - (workspace?.credits_used ?? 0)} / {workspace?.credits_total ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <span className="text-xs text-[color:var(--color-muted)]">Changes persist to your workspace.</span>
          <Button size="sm">Save</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <div className="h-9 px-3 py-2 text-sm rounded-md border border-white/10 bg-white/[0.03]">{user?.email}</div>
          </div>
        </CardContent>
        <CardFooter>
          <form action="/auth/signout" method="post" className="contents">
            <span className="text-xs text-[color:var(--color-muted)]">Sign out of this device.</span>
            <Button size="sm" variant="secondary" type="submit">Sign out</Button>
          </form>
        </CardFooter>
      </Card>

      <Card className="border-[color:var(--color-hot)]/30 bg-[color:var(--color-hot)]/[0.03]">
        <CardHeader><CardTitle>Danger zone</CardTitle><CardDescription>Deleting your workspace removes all offers, campaigns, ads, and uploads. Cannot be undone.</CardDescription></CardHeader>
        <CardFooter>
          <span className="text-xs text-[color:var(--color-hot)]">Permanent.</span>
          <Button size="sm" variant="danger">Delete workspace</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

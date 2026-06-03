/**
 * Admin layout — gate non-admins server-side, render the admin nav.
 * RLS already enforces this on the data layer, but explicit beats implicit.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/app/admin/models",     label: "Models" },
  { href: "/app/admin/keys",       label: "Keys" },
  { href: "/app/admin/test",       label: "A/B test" },
  { href: "/app/admin/presenters", label: "Presenters" },
  { href: "/app/admin/runs",       label: "Runs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/app");
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <span>Admin</span>
          <span>·</span>
          <span>Internal-only · Hidden from end users</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure providers, manage keys, and inspect generation runs.
        </p>
      </div>

      <nav className="flex gap-1 border-b mb-6">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 text-sm rounded-t-md hover:bg-muted transition-colors data-[active=true]:border-b-2 data-[active=true]:border-foreground data-[active=true]:text-foreground text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

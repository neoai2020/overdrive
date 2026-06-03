"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthFrame } from "@/components/auth-frame";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Workspace created");
        router.push("/app");
        router.refresh();
      } else {
        toast.success("Check your email to confirm your account");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Start free"
      title="Create your workspace"
      description="6 offers, 4 campaigns and 50 mock ads come pre-seeded so you can drive on day one."
    >
      <form onSubmit={signUp} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" minLength={8} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>

      <p className="text-xs text-[color:var(--color-muted)] mt-6 text-center">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[color:var(--color-acid)] hover:underline">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

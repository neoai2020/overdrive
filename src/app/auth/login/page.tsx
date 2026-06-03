"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthFrame } from "@/components/auth-frame";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function signInGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to Overdrive"
      description="Generate ads in bulk and push them straight to Meta."
    >
      <form onSubmit={signIn} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px bg-white/8 flex-1" />
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)]">or</span>
        <div className="h-px bg-white/8 flex-1" />
      </div>

      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={signInGoogle}>
        Continue with Google
      </Button>

      <p className="text-xs text-[color:var(--color-muted)] mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-[color:var(--color-acid)] hover:underline">Sign up</Link>
      </p>
    </AuthFrame>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { signIn, signInDemo, session, loading, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);

  // Already signed in — skip the form.
  useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("form");
    const { error } = await signIn(email.trim(), password);
    setBusy(null);
    if (error) setError(error);
    else router.replace(next);
  };

  const demo = async () => {
    setError(null);
    setBusy("demo");
    const { error } = await signInDemo();
    setBusy(null);
    if (error) setError(error);
    else router.replace(next);
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Pick up where the clinic left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {!configured ? (
        <p className="rounded-md border border-status-loading/50 bg-status-loading/5 px-3 py-2.5 text-[13px] text-foreground">
          Sign-in isn&apos;t configured yet. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-status-offline/50 bg-status-offline/5 px-3 py-2.5 text-[13px] text-foreground">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-offline" />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              placeholder="you@clinic.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={busy !== null} className="mt-1 h-11">
            {busy === "form" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={demo}
            className="h-11"
          >
            {busy === "demo" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Explore the demo account
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

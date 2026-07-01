"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, MailCheck } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";

function SignupContent() {
  const router = useRouter();
  const { signUp, session, loading, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsConfirmation) setSent(true);
    else router.replace("/dashboard");
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Keep your transcripts and notes in one place, across devices."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {!configured ? (
        <p className="rounded-md border border-status-loading/50 bg-status-loading/5 px-3 py-2.5 text-[13px] text-foreground">
          Sign-up isn&apos;t configured yet. Set the Supabase environment
          variables, then reload.
        </p>
      ) : sent ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-8 text-center">
          <MailCheck className="h-8 w-8 text-status-online" />
          <p className="text-[14px] text-foreground">
            Check your inbox to confirm <span className="font-medium">{email}</span>,
            then sign in.
          </p>
        </div>
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
              placeholder="you@clinic.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <Button type="submit" disabled={busy} className="mt-1 h-10">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}

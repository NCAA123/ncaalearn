import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { useServerFn } from "@tanstack/react-start";
import { recordLogin } from "@/lib/permissions.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — NCAA Academy" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Second factor step (only shown when the account has TOTP enrolled)
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [totp, setTotp] = useState("");
  const record = useServerFn(recordLogin);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate({ to: "/dashboard", replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  async function finishLogin() {
    const res = await record().catch(() => null);
    if (res?.suspicious) {
      toast.warning(`Unusual sign-in detected: ${res.reason}. Check your account security.`);
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // If the account has 2FA enrolled, Supabase requires stepping up to aal2.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0];
      setSubmitting(false);
      if (factor) {
        setMfa({ factorId: factor.id });
        return;
      }
    }

    setSubmitting(false);
    await finishLogin();
  }

  async function onVerifyTotp(e: FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setSubmitting(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfa.factorId });
    if (chErr) {
      setSubmitting(false);
      toast.error(chErr.message);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: ch.id,
      code: totp,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await finishLogin();
  }

  if (mfa) {
    return (
      <AuthShell
        title="Two-factor verification"
        subtitle="Enter the 6-digit code from your authenticator app."
      >
        <form onSubmit={onVerifyTotp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp">Authentication code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              className="font-mono tracking-[0.4em] text-center"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || totp.length !== 6}>
            {submitting ? "Verifying…" : "Verify"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMfa(null)}>
            Back
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Use your NCAA Arbiters account to access the Academy.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Don't have an account? Contact the NCAA secretariat — Academy access
          uses the same credentials as the main Arbiters dashboard.
        </p>
      </form>
    </AuthShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, KeyRound, MonitorSmartphone } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyLoginHistory,
  getTwoFactorState,
  activateTwoFactor,
  deactivateTwoFactor,
} from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Account Security — NCAA Academy" },
      {
        name: "description",
        content:
          "Manage two-factor authentication, backup codes and review recent sign-in activity on your NCAA Academy account.",
      },
      { property: "og:title", content: "Account Security — NCAA Academy" },
      {
        property: "og:description",
        content: "Two-factor authentication and sign-in history for your NCAA Academy account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div>
      <PageHeader
        title="Account security"
        description="Protect your Academy account with two-factor authentication and keep an eye on sign-in activity."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <TwoFactorCard />
        <PasswordCard />
      </div>
      <div className="mt-6">
        <LoginHistoryCard />
      </div>
    </div>
  );
}

function TwoFactorCard() {
  const qc = useQueryClient();
  const stateFn = useServerFn(getTwoFactorState);
  const activateFn = useServerFn(activateTwoFactor);
  const deactivateFn = useServerFn(deactivateTwoFactor);

  const { data: state } = useQuery({ queryKey: ["2fa-state"], queryFn: () => stateFn() });
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  const startEnroll = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) return toast.error(error.message);
    setEnrolling({
      id: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const verify = useMutation({
    mutationFn: async () => {
      if (!enrolling) throw new Error("Start enrolment first");
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enrolling.id,
      });
      if (chErr) throw new Error(chErr.message);
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.id,
        challengeId: ch.id,
        code,
      });
      if (error) throw new Error(error.message);
      return activateFn({ data: { factorId: enrolling.id } });
    },
    onSuccess: (res) => {
      setCodes(res.codes);
      setEnrolling(null);
      setCode("");
      toast.success("Two-factor authentication enabled");
      qc.invalidateQueries({ queryKey: ["2fa-state"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      return deactivateFn();
    },
    onSuccess: () => {
      toast.success("Two-factor authentication disabled");
      setCodes(null);
      qc.invalidateQueries({ queryKey: ["2fa-state"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Two-factor authentication
          {state?.enabled ? (
            <Badge className="ml-auto">Enabled</Badge>
          ) : (
            <Badge variant="outline" className="ml-auto">Off</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Use an authenticator app such as Google Authenticator or Authy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.required && !state.enabled && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Required for your role</AlertTitle>
            <AlertDescription>
              Administrators must enable two-factor authentication.
            </AlertDescription>
          </Alert>
        )}

        {codes && (
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium mb-2">Your backup codes — save them now</p>
            <p className="text-xs text-muted-foreground mb-3">
              Each code works once. They will not be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {codes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                navigator.clipboard.writeText(codes.join("\n"));
                toast.success("Copied");
              }}
            >
              Copy codes
            </Button>
          </div>
        )}

        {state?.enabled ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {state.backupCodesRemaining} backup code(s) remaining.
            </p>
            <Button variant="destructive" onClick={() => disable.mutate()} disabled={disable.isPending}>
              Disable two-factor
            </Button>
          </div>
        ) : enrolling ? (
          <div className="space-y-3">
            <img src={enrolling.qr} alt="Two-factor QR code" className="h-44 w-44 rounded bg-white p-2" />
            <p className="text-xs text-muted-foreground break-all">
              Or enter this key manually: <span className="font-mono">{enrolling.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="totp">6-digit code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="max-w-[10rem] font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => verify.mutate()} disabled={code.length !== 6 || verify.isPending}>
                Verify & enable
              </Button>
              <Button variant="ghost" onClick={() => setEnrolling(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll}>Set up two-factor</Button>
        )}
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (password !== confirm) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPassword("");
      setConfirm("");
      toast.success("Password updated. Other sessions will need to sign in again.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> Change password
        </CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="new-pass">New password</Label>
          <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-pass">Confirm password</Label>
          <Input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <Button onClick={() => change.mutate()} disabled={change.isPending}>Update password</Button>
      </CardContent>
    </Card>
  );
}

function LoginHistoryCard() {
  const fn = useServerFn(listMyLoginHistory);
  const { data } = useQuery({ queryKey: ["login-history"], queryFn: () => fn() });
  const rows = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorSmartphone className="h-4 w-4" /> Recent sign-ins
        </CardTitle>
        <CardDescription>The last 50 sign-ins on your account.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No sign-in activity recorded yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">When</th>
                  <th className="text-left font-medium px-4 py-2">Device</th>
                  <th className="text-left font-medium px-4 py-2">Location</th>
                  <th className="text-left font-medium px-4 py-2">IP</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{r.device ?? "—"}</td>
                    <td className="px-4 py-2">{r.location ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.ip_address ?? "—"}</td>
                    <td className="px-4 py-2">
                      {r.suspicious ? (
                        <Badge variant="destructive">{r.reason ?? "Unusual"}</Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

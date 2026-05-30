import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Account access — NCAA Academy" }] }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      title="No public signup"
      subtitle="The Academy uses your existing NCAA Arbiters account."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Academy access is provisioned by the NCAA administration. If you are a
          registered arbiter or candidate, sign in with the same email and
          password you use for the NCAA Dashboard.
        </p>
        <p>
          Don't have an account yet? Contact the NCAA secretariat to be
          onboarded.
        </p>
        <Button asChild className="w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
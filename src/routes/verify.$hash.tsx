import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Crown } from "lucide-react";
import { verifyCertificate } from "@/lib/cert.functions";

export const Route = createFileRoute("/verify/$hash")({
  head: () => ({ meta: [{ title: "Verify Certificate — NCAA Academy" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { hash } = Route.useParams();
  const fn = useServerFn(verifyCertificate);
  const { data, isLoading } = useQuery({
    queryKey: ["verify", hash],
    queryFn: () => fn({ data: { hash } }),
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">NCAA Academy</div>
            <div className="text-[11px] text-muted-foreground">Certificate Verification</div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Verifying…</p>
          ) : data?.valid ? (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-4 text-xl font-semibold">Certificate verified</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This is a genuine certificate issued by NCAA Academy.
              </p>
              <dl className="mt-6 text-left space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Recipient</dt>
                  <dd className="font-medium">{data.recipient_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Award</dt>
                  <dd className="font-medium">{data.title}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Certificate №</dt>
                  <dd className="font-mono">{data.certificate_number}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Issued</dt>
                  <dd>{new Date(data.issued_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="mt-4 text-xl font-semibold">Not a valid certificate</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We couldn't find a certificate matching this verification code.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
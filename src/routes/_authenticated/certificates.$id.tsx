import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "react-qr-code";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyCertificates } from "@/lib/cert.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/certificates/$id")({
  head: () => ({ meta: [{ title: "Certificate — NCAA Academy" }] }),
  component: CertificateView,
});

function CertificateView() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const fn = useServerFn(listMyCertificates);
  const { data, isLoading } = useQuery({ queryKey: ["my-certificates"], queryFn: () => fn() });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const cert = (data ?? []).find((c) => c.id === id);
  if (!cert) throw notFound();

  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${cert.verification_hash}`;
  const recipient =
    (user?.user_metadata?.first_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "NCAA Arbiter";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/certificates"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save as PDF
        </Button>
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="border-8 border-double border-primary/40 bg-card p-12 text-center shadow-xl print:shadow-none print:border-primary">
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Nigeria Chess Arbiters Association
          </div>
          <div className="mt-2 text-sm text-muted-foreground">NCAA Academy</div>
          <h1 className="mt-8 text-4xl font-serif tracking-wide text-foreground">
            Certificate of Achievement
          </h1>
          <p className="mt-8 text-sm text-muted-foreground">This is to certify that</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{recipient}</p>
          <p className="mt-6 text-sm text-muted-foreground">has successfully completed</p>
          <p className="mt-2 text-xl font-medium text-foreground">{cert.title}</p>
          <p className="mt-8 text-xs text-muted-foreground">
            Issued on {new Date(cert.issued_at).toLocaleDateString("en-NG", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>

          <div className="mt-10 flex items-end justify-between gap-6">
            <div className="text-left text-xs text-muted-foreground">
              <div className="font-mono text-foreground">{cert.certificate_number}</div>
              <div>Certificate ID</div>
              <a href={verifyUrl} className="mt-2 inline-block text-primary underline break-all">
                {verifyUrl}
              </a>
            </div>
            <div className="bg-white p-2 rounded">
              <QRCode value={verifyUrl} size={96} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, ExternalLink, Printer } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { listMyCertificates } from "@/lib/cert.functions";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "My Certificates — NCAA Academy" }] }),
  component: MyCertificates,
});

function MyCertificates() {
  const fn = useServerFn(listMyCertificates);
  const { data, isLoading } = useQuery({ queryKey: ["my-certificates"], queryFn: () => fn() });

  return (
    <div>
      <PageHeader
        title="My certificates"
        description="Digital certificates earned from completed exams. Each has a public verification link."
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="Pass an exam to earn your first certificate."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(data ?? []).map((c) => {
            const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${c.verification_hash}`;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground">#{c.certificate_number}</div>
                    <div className="text-xs text-muted-foreground">
                      Issued {new Date(c.issued_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/certificates/$id" params={{ id: c.id }}>
                      <Printer className="h-4 w-4" /> View / print
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={verifyUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Verify
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IdCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { getMyLicenses } from "@/lib/license.functions";

export const Route = createFileRoute("/_authenticated/license")({
  head: () => ({ meta: [{ title: "My License — NCAA Academy" }] }),
  component: MyLicense,
});

function MyLicense() {
  const fn = useServerFn(getMyLicenses);
  const { data, isLoading } = useQuery({ queryKey: ["my-licenses"], queryFn: () => fn() });

  return (
    <div>
      <PageHeader title="My license" description="Your active and historical arbiter licenses." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="No license yet"
          description="When a license is issued to you it will appear here. Complete the required exam to qualify."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((l) => {
            const expired = l.expires_at ? new Date(l.expires_at) < new Date() : false;
            const status = l.status === "revoked" ? "revoked" : expired ? "expired" : "active";
            return (
              <div key={l.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <IdCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{l.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{l.license_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Issued</dt>
                    <dd>{new Date(l.issued_at).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Expires</dt>
                    <dd>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "—"}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "expired" | "revoked" }) {
  const cfg = {
    active: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", label: "Active" },
    expired: { Icon: Clock, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400", label: "Expired" },
    revoked: { Icon: XCircle, cls: "bg-destructive/10 text-destructive", label: "Revoked" },
  }[status];
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
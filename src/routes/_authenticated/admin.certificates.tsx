import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { issueCertificate, listCertificates, revokeCertificate } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Admin" }] }),
  component: AdminCertificates,
});

function AdminCertificates() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");

  const listFn = useServerFn(listCertificates);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: () => listFn(),
    enabled: isStaff,
  });

  const issueFn = useServerFn(issueCertificate);
  const issueMut = useMutation({
    mutationFn: () => issueFn({ data: { user_id: userId, title } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-certificates"] });
      setUserId(""); setTitle("");
      toast.success("Certificate issued");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const revokeFn = useServerFn(revokeCertificate);
  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast.success("Certificate revoked");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isStaff) return <PageHeader title="Certificates" description="Staff access only." />;

  return (
    <div>
      <PageHeader title="Certificates" description="Issue and revoke arbiter certificates." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); if (userId && title) issueMut.mutate(); }}
          className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <h3 className="font-semibold">Issue new certificate</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID (UUID)</label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-…" required />
            <p className="text-xs text-muted-foreground">Find user IDs in the Users tab.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Certificate title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="National Arbiter — 2026" required />
          </div>
          <Button type="submit" className="w-full" disabled={issueMut.isPending}>
            {issueMut.isPending ? "Issuing…" : "Issue certificate"}
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No certificates yet" />
          ) : (
            (data ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    #{c.certificate_number} · {c.profile ? `${c.profile.first_name ?? ""} ${c.profile.last_name ?? ""} (${c.profile.email ?? ""})` : c.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { if (confirm("Revoke this certificate?")) revokeMut.mutate(c.id); }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Ban } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { issueLicense, listAllLicenses, revokeLicense } from "@/lib/license.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/licenses")({
  head: () => ({ meta: [{ title: "Licenses — Admin" }] }),
  component: AdminLicenses,
});

function AdminLicenses() {
  const { isAdmin, isStaff } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listAllLicenses);
  const issueFn = useServerFn(issueLicense);
  const revokeFn = useServerFn(revokeLicense);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-licenses"],
    queryFn: () => listFn(),
    enabled: isStaff,
  });

  const [form, setForm] = useState({ user_id: "", title: "", expires_at: "" });
  const issue = useMutation({
    mutationFn: () =>
      issueFn({
        data: {
          user_id: form.user_id,
          title: form.title,
          expires_at: form.expires_at || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
      setForm({ user_id: "", title: "", expires_at: "" });
      toast.success("License issued");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
      toast.success("License revoked");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isStaff) return <PageHeader title="Licenses" description="Staff access only." />;

  return (
    <div>
      <PageHeader title="Licenses" description="Issue and revoke arbiter licenses." />
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {isAdmin && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (form.user_id && form.title) issue.mutate();
            }}
            className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
          >
            <h3 className="font-semibold">Issue license</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID (UUID)</label>
              <Input
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">License title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="National Arbiter — 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry date (optional)</label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={issue.isPending}>
              {issue.isPending ? "Issuing…" : "Issue license"}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No licenses issued yet" />
          ) : (
            (data ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{l.license_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.profile
                      ? `${l.profile.first_name ?? ""} ${l.profile.last_name ?? ""} (${l.profile.email ?? ""})`
                      : l.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Issued {new Date(l.issued_at).toLocaleDateString()}
                    {l.expires_at && ` · expires ${new Date(l.expires_at).toLocaleDateString()}`}
                    {" · "}<span className="capitalize">{l.status}</span>
                  </div>
                </div>
                {isAdmin && l.status !== "revoked" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { if (confirm("Revoke this license?")) revoke.mutate(l.id); }}
                  >
                    <Ban className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
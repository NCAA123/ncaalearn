import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listPendingCpd, reviewCpd } from "@/lib/license.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/cpd")({
  head: () => ({ meta: [{ title: "CPD Review — Admin" }] }),
  component: AdminCpd,
});

function AdminCpd() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingCpd);
  const reviewFn = useServerFn(reviewCpd);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cpd"],
    queryFn: () => listFn(),
    enabled: isStaff,
  });
  const [pointOverrides, setPointOverrides] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const review = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected"; points?: number }) =>
      reviewFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cpd"] });
      toast.success("CPD updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isStaff) return <PageHeader title="CPD" description="Staff access only." />;

  const rows = (data ?? []).filter((r) => filter === "all" || r.status === "pending");

  return (
    <div>
      <PageHeader
        title="CPD review"
        description="Approve or reject continuing professional development submissions."
        action={
          <div className="flex gap-2">
            <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pending</Button>
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          </div>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing to review" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pts = pointOverrides[r.id] ?? Number(r.points);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{r.activity_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.profile
                        ? `${r.profile.first_name ?? ""} ${r.profile.last_name ?? ""} (${r.profile.email ?? ""})`
                        : r.user_id}
                      {" · "}{r.activity_date}
                      {" · "}<span className="capitalize">{r.status}</span>
                    </div>
                    <p className="mt-2 text-sm">{r.description}</p>
                    {r.evidence_url && (
                      <a href={r.evidence_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">
                        View evidence
                      </a>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        className="w-20"
                        value={pts}
                        onChange={(e) =>
                          setPointOverrides({ ...pointOverrides, [r.id]: Number(e.target.value) })
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: r.id, status: "approved", points: pts })}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review.mutate({ id: r.id, status: "rejected" })}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
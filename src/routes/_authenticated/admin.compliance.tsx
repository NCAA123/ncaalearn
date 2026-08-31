import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { grantComplianceOverride, listNonCompliantArbiters } from "@/lib/compliance.functions";

export const Route = createFileRoute("/_authenticated/admin/compliance")({
  head: () => ({ meta: [{ title: "Compliance — Admin" }] }),
  component: AdminCompliance,
});

function AdminCompliance() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const listFn = useServerFn(listNonCompliantArbiters);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-compliance"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const overrideFn = useServerFn(grantComplianceOverride);
  const overrideMut = useMutation({
    mutationFn: (v: { userId: string; reason: string }) => overrideFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-compliance"] });
      setReasonFor(null);
      setReason("");
      toast.success("Compliance hold lifted for this cycle");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return <EmptyState title="Admin access required" description="Only academy administrators can view compliance." />;
  }

  return (
    <div>
      <PageHeader
        title="Mandatory refresher compliance"
        description="Licensed arbiters overdue or approaching their annual refresher deadline."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState title="Everyone's compliant" description="No licensed arbiter is currently non-compliant." />
      ) : (
        <div className="space-y-2 max-w-3xl">
          {data.map((row) => {
            const s = row.status;
            if (!s.applicable) return null;
            const overdue = s.bannerLevel === "overdue";
            return (
              <div key={row.userId} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {row.profile ? `${row.profile.first_name ?? ""} ${row.profile.last_name ?? ""}` : row.userId}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={overdue ? "destructive" : "secondary"}>
                        {overdue ? `Overdue by ${Math.abs(s.daysUntilDue)}d` : `Due in ${s.daysUntilDue}d`}
                      </Badge>
                      {s.overrideActive && <Badge variant="outline">Override active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Outstanding: {s.courses.filter((c) => !c.completed).map((c) => c.title).join(", ") || "—"}
                    </p>
                  </div>
                  {!s.overrideActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReasonFor(row.userId)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Override
                    </Button>
                  )}
                </div>
                {reasonFor === row.userId && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (e.g. fine paid, medical exception)"
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!reason.trim() || overrideMut.isPending}
                      onClick={() => overrideMut.mutate({ userId: row.userId, reason })}
                    >
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

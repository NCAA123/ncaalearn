import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listPromotionApplications, reviewPromotion } from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  head: () => ({ meta: [{ title: "Promotion Review — NCAA Academy" }] }),
  component: AdminPromotions,
});

type Row = {
  id: string;
  user_id: string;
  from_title: string;
  to_title: string;
  status: string;
  notes: string | null;
  decision_notes: string | null;
  submitted_at: string;
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

function AdminPromotions() {
  const list = useServerFn(listPromotionApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: () => list(),
  });

  return (
    <div>
      <PageHeader title="Promotion review" description="Approve or reject arbiter title upgrade applications." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No applications" description="Submitted applications will appear here." />
      ) : (
        <div className="space-y-4">
          {(data as unknown as Row[]).map((r) => (
            <ApplicationCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ row }: { row: Row }) {
  const review = useServerFn(reviewPromotion);
  const qc = useQueryClient();
  const [notes, setNotes] = useState(row.decision_notes ?? "");
  const m = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      review({ data: { id: row.id, status, decision_notes: notes } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promotions"] }),
  });
  const pending = row.status === "submitted";
  const name = `${row.profile?.first_name ?? ""} ${row.profile?.last_name ?? ""}`.trim() || row.profile?.email || row.user_id;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-xs text-muted-foreground">
            {row.from_title || "None"} → <span className="font-medium text-foreground">{row.to_title}</span> ·{" "}
            {new Date(row.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={
            "text-[11px] px-2 py-0.5 rounded-full " +
            (row.status === "approved"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : row.status === "rejected"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground")
          }
        >
          {row.status}
        </span>
      </div>
      {row.notes && <p className="mt-3 text-sm text-muted-foreground italic">"{row.notes}"</p>}
      {pending && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Decision notes (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={() => m.mutate("approved")} disabled={m.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
            <Button variant="outline" onClick={() => m.mutate("rejected")} disabled={m.isPending}>
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle, TrendingUp, Send } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMyPromotionStatus, submitPromotion } from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/promotions")({
  head: () => ({ meta: [{ title: "Career Progression — NCAA Academy" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const fn = useServerFn(getMyPromotionStatus);
  const submit = useServerFn(submitPromotion);
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["promotion-status"], queryFn: () => fn() });

  const m = useMutation({
    mutationFn: (payload: { to_title: "NA" | "FA" | "IA"; notes?: string }) =>
      submit({ data: payload }),
    onSuccess: () => {
      setNotes("");
      qc.invalidateQueries({ queryKey: ["promotion-status"] });
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <PageHeader
        title="Career progression"
        description="Track your journey from National Arbiter to FIDE and International titles."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current title</p>
              <h2 className="text-lg font-semibold">{data.current ?? "Unranked"}</h2>
            </div>
            {data.nextTitle && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Next</p>
                <h2 className="text-lg font-semibold text-primary">{data.nextTitle}</h2>
              </div>
            )}
          </div>

          {data.nextTitle ? (
            <>
              <h3 className="text-sm font-medium mb-3">Readiness for {data.nextTitle}</h3>
              <ul className="space-y-2 mb-6">
                {data.criteria.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
                    {c.detail && (
                      <span className="ml-auto text-xs text-muted-foreground">{c.detail}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="space-y-3 border-t border-border pt-4">
                <label className="text-sm font-medium">Submit application</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for the review committee (tournaments officiated, achievements, etc.)"
                  rows={4}
                />
                <Button
                  onClick={() =>
                    m.mutate({ to_title: data.nextTitle as "NA" | "FA" | "IA", notes })
                  }
                  disabled={!data.ready || m.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {data.ready ? `Apply for ${data.nextTitle}` : "Not yet eligible"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You already hold the highest arbiter title. Congratulations!
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium mb-3">Application history</h3>
          {data.applications.length === 0 ? (
            <EmptyState title="No applications yet" description="Submit one when eligible." />
          ) : (
            <ul className="space-y-3">
              {data.applications.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Apply → {a.to_title}</span>
                    <span
                      className={
                        "text-[11px] px-2 py-0.5 rounded-full " +
                        (a.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : a.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground")
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.submitted_at).toLocaleDateString()}
                  </p>
                  {a.decision_notes && (
                    <p className="text-xs mt-2 text-muted-foreground">{a.decision_notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
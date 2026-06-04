import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { listGradingQueue } from "@/lib/cert.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/grading")({
  head: () => ({ meta: [{ title: "Grading Queue — Admin" }] }),
  component: GradingQueue,
});

function GradingQueue() {
  const { isStaff } = useAuth();
  const fn = useServerFn(listGradingQueue);
  const { data, isLoading } = useQuery({
    queryKey: ["grading-queue"],
    queryFn: () => fn(),
    enabled: isStaff,
  });

  if (!isStaff) return <PageHeader title="Grading" description="Staff access only." />;

  return (
    <div>
      <PageHeader
        title="Grading queue"
        description="Essay-bearing attempts awaiting manual review."
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Nothing to grade" description="All submitted attempts are graded." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((row) => {
            const r = row as {
              id: string; exam_id: string; submitted_at: string;
              profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
              exam: { title: string } | null;
            };
            const name = [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") || r.profile?.email || "Candidate";
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.exam?.title ?? "Exam"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {name} · submitted {new Date(r.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to="/admin/grading/$attemptId" params={{ attemptId: r.id }}>Grade</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
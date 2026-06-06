import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  GraduationCap,
  Award,
  IdCard,
  ClipboardCheck,
  FileQuestion,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/StatCard";
import { getAdminReports } from "@/lib/resources.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const { isStaff } = useAuth();
  const fetchReports = useServerFn(getAdminReports);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => fetchReports(),
    enabled: isStaff,
  });

  if (!isStaff) return <PageHeader title="Reports" description="Staff access only." />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Academy-wide activity, engagement and performance snapshot."
      />
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive mb-4">
          {(error as Error).message}
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Overall
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total users"
          value={isLoading ? "…" : data?.profiles.total ?? 0}
          icon={Users}
          hint={isLoading ? undefined : `${data?.profiles.last30 ?? 0} new in last 30 days`}
        />
        <StatCard
          label="Course enrollments"
          value={isLoading ? "…" : data?.enrollments.total ?? 0}
          icon={GraduationCap}
          tone="accent"
          hint={isLoading ? undefined : `${data?.enrollments.last30 ?? 0} new in last 30 days`}
        />
        <StatCard
          label="Exam attempts"
          value={isLoading ? "…" : data?.exams.attempts ?? 0}
          icon={FileQuestion}
          tone="warning"
        />
        <StatCard
          label="Pass rate"
          value={isLoading ? "…" : `${data?.exams.passRate ?? 0}%`}
          icon={TrendingUp}
          tone="success"
          hint={isLoading ? undefined : `${data?.exams.passed ?? 0} passed attempts`}
        />
        <StatCard
          label="Certificates issued"
          value={isLoading ? "…" : data?.certificates.total ?? 0}
          icon={Award}
          tone="success"
          hint={isLoading ? undefined : `${data?.certificates.last30 ?? 0} in last 30 days`}
        />
        <StatCard
          label="Active licenses"
          value={isLoading ? "…" : data?.licenses.active ?? 0}
          icon={IdCard}
        />
        <StatCard
          label="Pending grading"
          value={isLoading ? "…" : data?.exams.pendingGrading ?? 0}
          icon={ClipboardCheck}
          tone="warning"
        />
        <StatCard
          label="Pending CPD"
          value={isLoading ? "…" : data?.cpd.pending ?? 0}
          icon={ClipboardCheck}
          tone="warning"
        />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Top courses by enrollment
      </h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {isLoading ? (
          <div className="p-5 text-sm text-muted-foreground">Loading…</div>
        ) : (data?.courseStats ?? []).length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No course data yet.</div>
        ) : (
          data!.courseStats.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div className="font-medium text-foreground truncate">{c.title}</div>
              <div className="text-sm text-muted-foreground tabular-nums">
                {c.enrollments} enrolled
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
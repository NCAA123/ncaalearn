import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, BookOpen, GraduationCap, FileQuestion, Award, Megaphone, ClipboardList, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/StatCard";
import { getAdminStats } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — NCAA Academy" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { isAdmin, isStaff } = useAuth();
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
    enabled: isStaff,
  });

  if (!isStaff) {
    return (
      <div>
        <PageHeader title="Admin" description="Staff access only." />
        <p className="text-sm text-muted-foreground">You don't have permission to view this area.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin overview" description="System metrics and quick links to manage every part of the Academy." />
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={isLoading ? "…" : data?.academy_profiles ?? 0} icon={Users} />
        <StatCard label="Courses" value={isLoading ? "…" : data?.academy_courses ?? 0} icon={BookOpen} tone="accent" />
        <StatCard label="Enrollments" value={isLoading ? "…" : data?.academy_enrollments ?? 0} icon={ClipboardList} />
        <StatCard label="Seminars" value={isLoading ? "…" : data?.academy_seminars ?? 0} icon={GraduationCap} />
        <StatCard label="Exams" value={isLoading ? "…" : data?.academy_exams ?? 0} icon={FileQuestion} tone="warning" />
        <StatCard label="Certificates" value={isLoading ? "…" : data?.academy_certificates ?? 0} icon={Award} tone="success" />
        <StatCard label="Announcements" value={isLoading ? "…" : data?.academy_announcements ?? 0} icon={Megaphone} />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Manage</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminLink to="/admin/courses" title="Courses" desc="Create, publish and manage course content." />
        <AdminLink to="/admin/seminars" title="Seminars" desc="Schedule and run live training events." />
        <AdminLink to="/admin/exams" title="Examinations" desc="Question bank, exam configuration and review." />
        <AdminLink to="/admin/certificates" title="Certificates" desc="Issue and revoke achievement certificates." />
        <AdminLink to="/admin/resources" title="Resources" desc="Upload and manage the resource library." />
        <AdminLink to="/admin/reports" title="Reports" desc="Course, exam and enrollment reporting." />
      </div>

      {isAdmin && (
        <>
          <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            NCAA-wide administration
          </h2>
          <a
            href="https://nigarbadminapp.vercel.app/admin/academy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition"
          >
            <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-semibold text-foreground">NCAA Command Center</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Users &amp; roles, permissions, compliance, mentorship, promotions, simulations, announcements and settings now live here.
              </div>
            </div>
          </a>
        </>
      )}
    </div>
  );
}

function AdminLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
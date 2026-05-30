import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, FileQuestion, Award, IdCard, ListChecks, TrendingUp, Users, Bell, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NCAA Academy" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin, isStaff, isLicensedArbiter, profile, roles } = useAuth();
  if (isAdmin) return <AdminDashboard />;
  if (isStaff) return <InstructorDashboard />;
  if (isLicensedArbiter) return <ArbiterDashboard />;
  return <CandidateDashboard />;
}

/* ---------------- Candidate ---------------- */
function CandidateDashboard() {
  const { profile, user } = useAuth();
  const first = profile?.first_name || user?.email?.split("@")[0] || "there";

  const { data } = useQuery({
    queryKey: ["candidate-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: enrollments }, { data: nextSeminar }, { data: announce }] = await Promise.all([
        supabase.from("academy_enrollments").select("*, academy_courses(title, level)").eq("user_id", user!.id),
        supabase.from("academy_seminars").select("*").gt("starts_at", new Date().toISOString()).eq("is_published", true).order("starts_at").limit(1),
        supabase.from("academy_announcements").select("*").not("published_at", "is", null).order("published_at", { ascending: false }).limit(3),
      ]);
      return { enrollments: enrollments ?? [], nextSeminar: nextSeminar?.[0] ?? null, announce: announce ?? [] };
    },
  });

  const totalProgress = data?.enrollments.length
    ? Math.round(data.enrollments.reduce((s, e: any) => s + (e.progress_pct ?? 0), 0) / data.enrollments.length)
    : 0;

  return (
    <>
      <WelcomeBanner name={first} subtitle="Your journey to National Arbiter starts here." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Overall progress" value={`${totalProgress}%`} hint="across enrolled courses" icon={TrendingUp} />
        <StatCard label="Courses" value={data?.enrollments.length ?? 0} hint="enrolled" icon={BookOpen} tone="accent" />
        <StatCard label="Practice score" value="—" hint="no attempts yet" icon={FileQuestion} />
        <StatCard label="Next seminar" value={data?.nextSeminar ? formatDistanceToNow(new Date(data.nextSeminar.starts_at)) : "—"} hint={data?.nextSeminar?.title ?? "none scheduled"} icon={GraduationCap} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Course progress</h3>
            <Button asChild variant="ghost" size="sm"><Link to="/courses">Browse catalog</Link></Button>
          </div>
          {data?.enrollments.length ? (
            <div className="space-y-4">
              {data.enrollments.slice(0, 5).map((e: any) => (
                <div key={e.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{e.academy_courses?.title ?? "Course"}</span>
                    <span className="text-muted-foreground">{e.progress_pct ?? 0}%</span>
                  </div>
                  <Progress value={e.progress_pct ?? 0} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No enrollments yet" description="Browse the catalog and enrol in your first course." action={<Button asChild><Link to="/courses">Browse courses</Link></Button>} />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Announcements</h3>
          {data?.announce.length ? (
            <ul className="space-y-3">
              {data.announce.map((a: any) => (
                <li key={a.id} className="border-l-2 border-accent pl-3">
                  <div className="text-sm font-medium text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Arbiter (NA/FA/IA) ---------------- */
function ArbiterDashboard() {
  const { user, profile } = useAuth();
  const { data } = useQuery({
    queryKey: ["arbiter-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: license }, { data: cpd }] = await Promise.all([
        supabase.from("academy_licenses").select("*").eq("user_id", user!.id).eq("status", "active").order("issued_at", { ascending: false }).limit(1),
        supabase.from("academy_cpd_records").select("*").eq("user_id", user!.id).eq("status", "approved"),
      ]);
      const totalCpd = (cpd ?? []).reduce((s, r: any) => s + Number(r.points || 0), 0);
      return { license: license?.[0] ?? null, totalCpd, cpdCount: cpd?.length ?? 0 };
    },
  });

  const target = 50;
  const license = data?.license;

  return (
    <>
      <div className="rounded-xl p-6 mb-6 text-sidebar-foreground" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">Welcome back</div>
            <h1 className="text-2xl font-semibold mt-1">{profile?.first_name} {profile?.last_name}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <Badge variant="secondary" className="bg-white/15 text-sidebar-foreground border-0">{profile?.arbiter_title || "Arbiter"}</Badge>
              {license && <span className="opacity-90">License {license.license_number} · {license.status}</span>}
            </div>
          </div>
          <Button asChild variant="secondary"><Link to="/cpd">Log CPD activity</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="CPD points" value={`${data?.totalCpd ?? 0} / ${target}`} hint="this period" icon={ListChecks} tone="accent" />
        <StatCard label="License" value={license?.status ?? "—"} hint={license?.expires_at ? `Expires ${new Date(license.expires_at).toLocaleDateString()}` : "no license on file"} icon={IdCard} />
        <StatCard label="Activities logged" value={data?.cpdCount ?? 0} icon={Sparkles} />
        <StatCard label="Pending exams" value={0} hint="up to date" icon={FileQuestion} tone="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">CPD progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Period target</span><span className="font-medium">{data?.totalCpd ?? 0} / {target} points</span></div>
            <Progress value={Math.min(100, ((data?.totalCpd ?? 0) / target) * 100)} />
            <p className="text-xs text-muted-foreground">Log seminars, courses and tournament activity to earn CPD points.</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Promotion readiness</h3>
          <p className="text-sm text-muted-foreground">Promotion pathway tracking comes online in Sprint 11.</p>
        </div>
      </div>
    </>
  );
}

/* ---------------- Instructor ---------------- */
function InstructorDashboard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["instructor-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ count: courseCount }, { count: seminarCount }, { count: studentCount }] = await Promise.all([
        supabase.from("academy_courses").select("*", { count: "exact", head: true }).eq("created_by", user!.id),
        supabase.from("academy_seminars").select("*", { count: "exact", head: true }).eq("instructor_id", user!.id),
        supabase.from("academy_enrollments").select("*", { count: "exact", head: true }),
      ]);
      return { courseCount: courseCount ?? 0, seminarCount: seminarCount ?? 0, studentCount: studentCount ?? 0 };
    },
  });
  return (
    <>
      <PageHeader title="Instructor overview" description="Manage your courses, seminars and submissions." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My courses" value={data?.courseCount ?? 0} icon={BookOpen} />
        <StatCard label="Total enrollments" value={data?.studentCount ?? 0} icon={Users} tone="accent" />
        <StatCard label="My seminars" value={data?.seminarCount ?? 0} icon={GraduationCap} />
        <StatCard label="Pending grading" value={0} hint="essay submissions" icon={FileQuestion} tone="warning" />
      </div>
      <EmptyState title="Course management UI coming next" description="Sprint 2 brings full course CRUD, lesson builder, and grading queues." />
    </>
  );
}

/* ---------------- Admin ---------------- */
function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [users, licenses, exams, certs] = await Promise.all([
        supabase.from("academy_profiles").select("*", { count: "exact", head: true }),
        supabase.from("academy_licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("academy_exam_attempts").select("*", { count: "exact", head: true }).gte("started_at", new Date(Date.now() - 86_400_000).toISOString()),
        supabase.from("academy_certificates").select("*", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        licenses: licenses.count ?? 0,
        examsToday: exams.count ?? 0,
        certs: certs.count ?? 0,
      };
    },
  });
  return (
    <>
      <PageHeader title="System overview" description="High-level health of NCAA Academy." action={<Button asChild><Link to="/admin/announcements">New announcement</Link></Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total users" value={data?.users ?? 0} icon={Users} />
        <StatCard label="Active licenses" value={data?.licenses ?? 0} icon={IdCard} tone="accent" />
        <StatCard label="Exams today" value={data?.examsToday ?? 0} icon={FileQuestion} />
        <StatCard label="Certificates issued" value={data?.certs ?? 0} icon={Award} tone="success" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-2">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/announcements">Create announcement</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/users">Manage users</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/courses">Browse catalog</Link></Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-2">System alerts</h3>
          <p className="text-sm text-muted-foreground">No alerts. License expiry monitoring activates in Sprint 7.</p>
        </div>
      </div>
    </>
  );
}

function WelcomeBanner({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="rounded-xl p-6 mb-6 text-sidebar-foreground" style={{ background: "var(--gradient-primary)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">Welcome back</div>
          <h1 className="text-2xl font-semibold mt-1 capitalize">{name}</h1>
          <p className="text-sm opacity-85 mt-1">{subtitle}</p>
        </div>
        <Button asChild variant="secondary"><Link to="/courses">Continue learning</Link></Button>
      </div>
    </div>
  );
}
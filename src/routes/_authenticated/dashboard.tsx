import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, GraduationCap, FileQuestion, Award, IdCard, ListChecks,
  TrendingUp, Users, CheckCircle2, Circle, AlertTriangle, ArrowRight, Layers, ClipboardCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import {
  getCandidateDashboard, getArbiterDashboard, getInstructorDashboard, getAdminDashboard,
} from "@/lib/dashboard.functions";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NCAA Academy" },
      { name: "description", content: "Your personalised NCAA Academy control panel: progress, CPD, licences and upcoming exams." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin, isStaff, isLicensedArbiter } = useAuth();
  return (
    <>
      <AnnouncementBanner />
      {isAdmin ? <AdminDashboard /> : isStaff ? <InstructorDashboard /> : isLicensedArbiter ? <ArbiterDashboard /> : <CandidateDashboard />}
    </>
  );
}

function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

/* ---------------- Candidate ---------------- */
function CandidateDashboard() {
  const { profile, user } = useAuth();
  const fn = useServerFn(getCandidateDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dash-candidate", user?.id],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  const first = profile?.first_name || user?.email?.split("@")[0] || "there";
  if (isLoading) return <Loading />;

  const next = data?.nextLesson ?? null;

  return (
    <>
      <div className="rounded-xl p-6 mb-6 text-sidebar-foreground" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">Welcome back</div>
            <h1 className="text-2xl font-semibold mt-1 capitalize">{first}</h1>
            <p className="text-sm opacity-85 mt-1">Your journey to National Arbiter</p>
          </div>
          <Button asChild variant="secondary">
            {next?.courseSlug ? (
              <Link to="/courses/$slug/lessons/$lessonId" params={{ slug: next.courseSlug, lessonId: next.lessonId }}>Continue learning</Link>
            ) : (
              <Link to="/courses">Continue learning</Link>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Progress" value={`${data?.overall ?? 0}%`} hint="across enrolled courses" icon={TrendingUp} />
        <StatCard label="Modules" value={`${data?.modulesDone ?? 0} / ${data?.modulesTotal ?? 0}`} hint="completed" icon={Layers} tone="accent" />
        <StatCard label="Practice score" value={data?.practiceScore != null ? `${data.practiceScore}%` : "—"} hint={data?.practiceScore != null ? "average of attempts" : "no attempts yet"} icon={FileQuestion} />
        <StatCard
          label="Upcoming seminar"
          value={data?.nextSeminar ? formatDistanceToNow(new Date(data.nextSeminar['starts_at'] as string)) : "—"}
          hint={(data?.nextSeminar?.['title'] as string) ?? "none scheduled"}
          icon={GraduationCap}
          tone="warning"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Panel title="Course progress" className="lg:col-span-2" action={<Button asChild variant="ghost" size="sm"><Link to="/courses">Browse catalog</Link></Button>}>
          {data?.courses.length ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="font-medium">Overall</span><span className="text-muted-foreground">{data.overall}%</span></div>
                <Progress value={data.overall} />
              </div>
              {data.courses.slice(0, 6).map((c) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{c.title}</span>
                    <span className="text-muted-foreground">{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No enrollments yet" description="Browse the catalog and enrol in your first course." action={<Button asChild><Link to="/courses">Browse courses</Link></Button>} />
          )}
        </Panel>

        <Panel title="Next action">
          {next ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pick up where you left off:</p>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{next.moduleTitle}</div>
                <div className="font-medium text-foreground">{next.lessonTitle}</div>
              </div>
              <Button asChild className="w-full">
                <Link to="/courses/$slug/lessons/$lessonId" params={{ slug: next.courseSlug, lessonId: next.lessonId }}>
                  Start lesson <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing outstanding — enrol in a course to get your next step.</p>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Recent activity">
          {data?.activity.length ? (
            <ul className="space-y-3">
              {data.activity.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary shrink-0" />
                  <span className="text-foreground">{a.text}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </Panel>

        <Panel title="Upcoming exams" action={<Button asChild variant="ghost" size="sm"><Link to="/exams">All exams</Link></Button>}>
          {data?.upcomingExams.length ? (
            <ul className="space-y-3">
              {data.upcomingExams.map((e) => (
                <li key={e['id'] as string} className="rounded-lg border border-border p-3">
                  <div className="font-medium text-sm text-foreground">{e['title'] as string}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e['available_from'] ? format(new Date(e['available_from'] as string), "dd/MM/yyyy") : "Open now"} · {e['duration_minutes'] as number} min · pass {e['pass_score'] as number}%
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No exams published yet.</p>}
        </Panel>
      </div>
    </>
  );
}

/* ---------------- Licensed arbiter ---------------- */
function ArbiterDashboard() {
  const { user, profile } = useAuth();
  const fn = useServerFn(getArbiterDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dash-arbiter", user?.id],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  if (isLoading) return <Loading />;
  const license = data?.license ?? null;
  const expires = license?.['expires_at'] ? new Date(license['expires_at'] as string) : null;
  const cpdPct = data ? Math.min(100, Math.round((data.cpdPoints / Math.max(1, data.cpdTarget)) * 100)) : 0;

  return (
    <>
      <div className="rounded-xl p-6 mb-6 text-sidebar-foreground" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">Title</div>
            <h1 className="text-2xl font-semibold mt-1">{profile?.arbiter_title || data?.currentTitle || "Arbiter"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {license ? (
                <>
                  <Badge variant="secondary" className="bg-white/15 text-sidebar-foreground border-0">
                    {license['license_number'] as string} · {license['status'] as string}
                  </Badge>
                  {expires && (
                    <span className="opacity-90">
                      Expires {format(expires, "MMMM yyyy")} — {formatDistanceToNow(expires)} remaining
                    </span>
                  )}
                </>
              ) : <span className="opacity-90">No licence on file</span>}
            </div>
          </div>
          <Button asChild variant="secondary"><Link to="/cpd">Log CPD activity</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="CPD" value={`${data?.cpdPoints ?? 0}/${data?.cpdTarget ?? 0}`} hint="points this cycle" icon={ListChecks} tone="accent" />
        <StatCard label="Promotion" value={`${data?.readiness ?? 0}%`} hint={data?.nextTitle ? `ready for ${data.nextTitle}` : "highest title held"} icon={TrendingUp} />
        <StatCard label="Pending exams" value={data?.pendingExams ?? 0} hint={data?.pendingExams ? "awaiting completion" : "up to date"} icon={FileQuestion} tone={data?.pendingExams ? "warning" : "success"} />
        <StatCard label="Rule updates" value={data?.ruleUpdates.length ?? 0} hint="new in last 30 days" icon={BookOpen} />
      </div>

      <Panel
        title={`CPD progress — ${data?.cpdPeriod ?? "current cycle"}`}
        className="mb-4"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/cpd">View CPD record</Link></Button>
            <Button asChild size="sm"><Link to="/cpd">Log new activity</Link></Button>
          </div>
        }
      >
        <Progress value={cpdPct} />
        <p className="text-sm text-muted-foreground mt-2">
          {data && data.cpdPoints >= data.cpdTarget
            ? `Target met — ${data.cpdPoints} points recorded.`
            : `${(data?.cpdTarget ?? 0) - (data?.cpdPoints ?? 0)} points still needed (${data?.cpdCount ?? 0} approved activities).`}
        </p>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={data?.nextTitle ? `Promotion to ${data.nextTitle}` : "Promotion"} action={<Button asChild variant="ghost" size="sm"><Link to="/promotions">Details</Link></Button>}>
          {data?.criteria.length ? (
            <>
              <ul className="space-y-2 mb-4">
                {data.criteria.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.detail}</span>
                  </li>
                ))}
              </ul>
              <Progress value={data.readiness} />
              <p className="text-xs text-muted-foreground mt-2">Progress: {data.readiness}%</p>
            </>
          ) : <p className="text-sm text-muted-foreground">You hold the highest title tracked by the Academy.</p>}
        </Panel>

        <Panel title="Pending tasks" action={<Button asChild variant="ghost" size="sm"><Link to="/my-learning">View all</Link></Button>}>
          {data?.pendingTasks.length ? (
            <ul className="space-y-2">
              {data.pendingTasks.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="h-3.5 w-3.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nothing outstanding. Well done.</p>}
        </Panel>
      </div>
    </>
  );
}

/* ---------------- Instructor ---------------- */
function InstructorDashboard() {
  const { user } = useAuth();
  const fn = useServerFn(getInstructorDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dash-instructor", user?.id],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  if (isLoading) return <Loading />;

  return (
    <>
      <PageHeader title="Instructor overview" description="Your courses, grading queue and upcoming seminars." action={<Button asChild><Link to="/admin/courses">Manage courses</Link></Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Courses" value={data?.courseCount ?? 0} hint="active" icon={BookOpen} />
        <StatCard label="Students" value={data?.students ?? 0} hint="unique enrollments" icon={Users} tone="accent" />
        <StatCard label="Pending grading" value={data?.pendingGrading ?? 0} hint="essay submissions" icon={ClipboardCheck} tone="warning" />
        <StatCard label="Avg pass rate" value={data?.passRate != null ? `${data.passRate}%` : "—"} hint="graded attempts" icon={TrendingUp} tone="success" />
      </div>

      <Panel title="Courses I manage" className="mb-4" action={<Button asChild variant="ghost" size="sm"><Link to="/admin/courses">Open builder</Link></Button>}>
        {data?.courses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Course</th><th>Enrolled</th><th>Avg completion</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2.5 font-medium text-foreground">{c.title} {!c.published && <Badge variant="outline" className="ml-2 text-[10px]">draft</Badge>}</td>
                    <td>{c.enrolled}</td>
                    <td className="w-40"><div className="flex items-center gap-2"><Progress value={c.avgCompletion} className="w-24" /><span className="text-xs text-muted-foreground">{c.avgCompletion}%</span></div></td>
                    <td className="text-xs text-muted-foreground">{c.updated_at ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No courses yet" description="Create your first course to start enrolling arbiters." action={<Button asChild><Link to="/admin/courses">Create course</Link></Button>} />}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Pending manual grading" action={<Button asChild variant="ghost" size="sm"><Link to="/admin/grading">Grading queue</Link></Button>}>
          {data?.gradingQueue.length ? (
            <ul className="space-y-2">
              {data.gradingQueue.map((g) => (
                <li key={g['id'] as string} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-foreground">Attempt {(g['id'] as string).slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{g['submitted_at'] ? formatDistanceToNow(new Date(g['submitted_at'] as string), { addSuffix: true }) : "—"}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nothing awaiting review.</p>}
        </Panel>

        <Panel title="Upcoming seminars" action={<Button asChild variant="ghost" size="sm"><Link to="/seminars">All seminars</Link></Button>}>
          {data?.seminars.length ? (
            <ul className="space-y-2">
              {data.seminars.map((s) => (
                <li key={s['id'] as string} className="rounded-lg border border-border px-3 py-2">
                  <div className="text-sm font-medium text-foreground">{s['title'] as string}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(s['starts_at'] as string), "dd MMM yyyy, HH:mm")} · {s['mode'] as string}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">You are not leading any upcoming seminars.</p>}
        </Panel>
      </div>
    </>
  );
}

/* ---------------- Admin ---------------- */
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

function AdminDashboard() {
  const fn = useServerFn(getAdminDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dash-admin"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  if (isLoading) return <Loading />;

  return (
    <>
      <PageHeader title="System overview" description="High-level health of NCAA Academy." action={<Button asChild><Link to="/admin/announcements">New announcement</Link></Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total users" value={data?.users ?? 0} icon={Users} />
        <StatCard label="Active licenses" value={data?.activeLicenses ?? 0} icon={IdCard} tone="accent" />
        <StatCard label="Exams today" value={data?.examsToday ?? 0} icon={FileQuestion} />
        <StatCard label="Certificates" value={data?.certificates ?? 0} hint="issued in total" icon={Award} tone="success" />
        <StatCard label="Pending reviews" value={data?.pendingReviews ?? 0} hint={`${data?.pendingGrading ?? 0} grading · ${data?.pendingCpd ?? 0} CPD · ${data?.pendingPromotions ?? 0} promotions`} icon={ClipboardCheck} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Exam attempts — last 7 days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="CPD compliance">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.cpdCompliance ?? []} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {(data?.cpdCompliance ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Latest exam submissions" action={<Button asChild variant="ghost" size="sm"><Link to="/admin/grading">Grading</Link></Button>}>
          {data?.recent.length ? (
            <ul className="space-y-2">
              {data.recent.map((r) => (
                <li key={r['id'] as string} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-foreground">Attempt {(r['id'] as string).slice(0, 8)}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={r['passed'] ? "secondary" : "outline"}>{r['score'] != null ? `${r['score']}%` : (r['status'] as string)}</Badge>
                    <span className="text-xs text-muted-foreground">{r['submitted_at'] ? formatDistanceToNow(new Date(r['submitted_at'] as string), { addSuffix: true }) : "—"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No submissions yet.</p>}
        </Panel>

        <Panel title="System alerts">
          <ul className="space-y-2 text-sm">
            {(data?.expiring ?? []).map((l) => (
              <li key={l['id'] as string} className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-foreground">Licence {l['license_number'] as string} expires {format(new Date(l['expires_at'] as string), "dd MMM yyyy")}</span>
              </li>
            ))}
            {data?.pendingReviews ? (
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-foreground">{data.pendingReviews} item(s) awaiting review</span>
              </li>
            ) : null}
            {!data?.expiring.length && !data?.pendingReviews ? <li className="text-muted-foreground">No alerts.</li> : null}
          </ul>
        </Panel>
      </div>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/announcements">Create announcement</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/resources">Upload resource</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/seminars">Schedule seminar</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/reports">Generate report</Link></Button>
        </div>
      </Panel>
    </>
  );
}

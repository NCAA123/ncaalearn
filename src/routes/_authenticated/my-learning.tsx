import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, PlayCircle, Award, Clock, Bookmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-learning")({
  head: () => ({ meta: [{ title: "My Learning — NCAA Academy" }] }),
  component: MyLearningPage,
});

const TABS = [
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "bookmarked", label: "Bookmarked" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function MyLearningPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("in_progress");

  const { data, isLoading } = useQuery({
    queryKey: ["my-learning", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("academy_enrollments")
        .select(
          "id,progress_pct,completed_at,enrolled_at,last_accessed_at,course:academy_courses(id,title,slug,short_description,description,level,cover_url,cpd_points,duration_minutes)",
        )
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      return rows ?? [];
    },
  });

  const { data: bookmarked } = useQuery({
    queryKey: ["bookmarked-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("academy_course_bookmarks")
        .select(
          "course:academy_courses(id,title,slug,short_description,description,level,cover_url,cpd_points,duration_minutes)",
        )
        .eq("user_id", user!.id);
      return (rows ?? []).map((r: any) => ({ id: r.course?.id, course: r.course }));
    },
  });

  const inProgress = (data ?? []).filter((r: any) => !r.completed_at);
  const completed = (data ?? []).filter((r: any) => r.completed_at);

  const stats = useMemo(() => {
    const cpd = completed.reduce((s: number, r: any) => s + (r.course?.cpd_points ?? 0), 0);
    const hours =
      (data ?? []).reduce(
        (s: number, r: any) =>
          s + ((r.course?.duration_minutes ?? 0) * (r.progress_pct ?? 0)) / 100,
        0,
      ) / 60;
    return { enrolled: (data ?? []).length, completed: completed.length, cpd, hours };
  }, [data, completed]);

  const resume = inProgress
    .slice()
    .sort((a: any, b: any) =>
      String(b.last_accessed_at ?? b.enrolled_at).localeCompare(
        String(a.last_accessed_at ?? a.enrolled_at),
      ),
    )[0];

  const visible =
    tab === "in_progress" ? inProgress : tab === "completed" ? completed : (bookmarked ?? []);

  return (
    <>
      <PageHeader
        title="My learning"
        description="Pick up where you left off, or browse the catalog for more."
        action={
          <Button asChild variant="outline">
            <Link to="/courses">Browse catalog</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Courses enrolled", value: stats.enrolled, icon: BookOpen },
          { label: "Courses completed", value: stats.completed, icon: CheckCircle2 },
          { label: "CPD points earned", value: stats.cpd, icon: Award },
          { label: "Learning hours", value: stats.hours.toFixed(1), icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {resume?.course && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Continue learning
            </div>
            <h3 className="font-semibold text-foreground truncate">{resume.course.title}</h3>
            <Progress value={resume.progress_pct ?? 0} className="h-1.5 mt-2 max-w-sm" />
          </div>
          <Button asChild>
            <Link to="/courses/$slug" params={{ slug: resume.course.slug ?? "" }}>
              Resume →
            </Link>
          </Button>
        </div>
      )}

      <div className="flex gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "px-3 py-1.5 rounded-md text-xs font-medium border transition " +
              (tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (data ?? []).length === 0 && (bookmarked ?? []).length === 0 ? (
        <EmptyState
          title="You haven't enrolled in a course yet"
          description="Browse the catalog and start with a course that matches your level."
          action={
            <Button asChild>
              <Link to="/courses">Browse courses</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            tab === "bookmarked"
              ? "No bookmarked courses"
              : tab === "completed"
                ? "No completed courses yet"
                : "Nothing in progress"
          }
          description="Browse the catalog to find your next course."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((r: any, i: number) => (
            <EnrollmentCard key={r.id ?? i} row={r} bookmarkTab={tab === "bookmarked"} />
          ))}
        </div>
      )}
    </>
  );
}

function EnrollmentCard({ row, bookmarkTab }: { row: any; bookmarkTab?: boolean }) {
  const c = row.course;
  if (!c) return null;
  const done = !!row.completed_at;
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: c.slug ?? "" }}
      className="rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <BookOpen className="h-5 w-5" />
        </div>
        {bookmarkTab ? (
          <Badge variant="outline" className="gap-1">
            <Bookmark className="h-3 w-3" /> Saved
          </Badge>
        ) : done ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <PlayCircle className="h-3 w-3" /> {row.progress_pct ?? 0}%
          </Badge>
        )}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {String(c.level ?? "").replace(/_/g, " ")}
      </div>
      <h3 className="font-semibold text-foreground mt-1">{c.title}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
        {c.short_description || c.description}
      </p>
      {!done && !bookmarkTab && (
        <div className="mt-4">
          <Progress value={row.progress_pct ?? 0} className="h-1.5" />
        </div>
      )}
    </Link>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Search, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — NCAA Academy" }] }),
  component: CoursesPage,
});

const LEVELS = ["all", "beginner", "intermediate", "advanced"] as const;
type Level = (typeof LEVELS)[number];

function CoursesPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Level>("all");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_enrollments")
        .select("course_id,progress_pct,completed_at")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const enrolledMap = useMemo(() => {
    const m = new Map<string, { progress_pct: number | null; completed_at: string | null }>();
    (enrollments ?? []).forEach((e: any) => m.set(e.course_id, e));
    return m;
  }, [enrollments]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (courses ?? []).filter((c: any) => {
      if (level !== "all" && (c.level ?? "").toLowerCase() !== level) return false;
      if (term && !`${c.title} ${c.description ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [courses, q, level]);

  return (
    <>
      <PageHeader title="Course catalog" description="Browse and enrol in arbiter training courses." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium border transition capitalize " +
                (level === l
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground")
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any) => {
            const enrolled = enrolledMap.get(c.id);
            return (
              <Link
                key={c.id}
                to="/courses/$slug"
                params={{ slug: c.slug }}
                className="group rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  {enrolled?.completed_at ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </Badge>
                  ) : enrolled ? (
                    <Badge variant="outline">Enrolled</Badge>
                  ) : null}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {c.level ?? "—"}
                </div>
                <h3 className="font-semibold text-foreground mt-1 group-hover:text-primary transition">
                  {c.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  {c.duration_minutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(c.duration_minutes / 60) || 1}h
                    </span>
                  ) : null}
                  {enrolled && !enrolled.completed_at && (
                    <span className="ml-auto">{enrolled.progress_pct ?? 0}%</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={q || level !== "all" ? "No courses match your filters" : "No published courses yet"}
          description={
            q || level !== "all"
              ? "Try a different keyword or level."
              : "Once admins publish courses, they will appear here."
          }
        />
      )}
    </>
  );
}
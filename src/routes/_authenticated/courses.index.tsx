import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Search, CheckCircle2, Award, Users, Bookmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses/")({
  head: () => ({ meta: [{ title: "Courses — NCAA Academy" }] }),
  component: CoursesPage,
});

const LEVELS = [
  "beginner",
  "candidate",
  "national_arbiter",
  "fide_arbiter",
  "international_arbiter",
  "cpd",
];
const TOPICS = [
  "Laws of Chess",
  "Pairings",
  "Anti-Cheating",
  "Tournament Regulations",
  "Ethics",
  "Appeals",
  "International Regulations",
];
const DURATIONS = [
  { key: "lt1", label: "Under 1 hour" },
  { key: "1to3", label: "1–3 hours" },
  { key: "gt3", label: "3+ hours" },
];
const STATUSES = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];
const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "newest", label: "Newest First" },
  { key: "popular", label: "Most Popular" },
  { key: "cpd", label: "CPD Points (high to low)" },
  { key: "duration", label: "Duration (short to long)" },
  { key: "alpha", label: "Alphabetical" },
];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="border-b border-border pb-3 mb-3 last:border-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </div>
      <div className="space-y-1.5">
        {options.map((o) => (
          <label key={o.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(o.key)}
              onChange={() => onToggle(o.key)}
              className="accent-[hsl(var(--primary))]"
            />
            <span className="capitalize">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CoursesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [durations, setDurations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [cpdOnly, setCpdOnly] = useState(false);
  const [sort, setSort] = useState("recommended");

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

  const { data: counts } = useQuery({
    queryKey: ["course-enroll-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("academy_enrollments").select("course_id");
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        m[r.course_id] = (m[r.course_id] ?? 0) + 1;
      });
      return m;
    },
  });

  const { data: moduleCounts } = useQuery({
    queryKey: ["course-module-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("academy_modules").select("course_id");
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        m[r.course_id] = (m[r.course_id] ?? 0) + 1;
      });
      return m;
    },
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["course-bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_course_bookmarks")
        .select("course_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((b: any) => b.course_id as string);
    },
  });

  const bookmarkMut = useMutation({
    mutationFn: async (courseId: string) => {
      if ((bookmarks ?? []).includes(courseId)) {
        await supabase
          .from("academy_course_bookmarks")
          .delete()
          .eq("user_id", user!.id)
          .eq("course_id", courseId);
      } else {
        await supabase
          .from("academy_course_bookmarks")
          .insert({ user_id: user!.id, course_id: courseId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-bookmarks"] }),
  });

  const enrolledMap = useMemo(() => {
    const m = new Map<string, { progress_pct: number | null; completed_at: string | null }>();
    (enrollments ?? []).forEach((e: any) => m.set(e.course_id, e));
    return m;
  }, [enrollments]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = (courses ?? []).filter((c: any) => {
      if (levels.length && !levels.includes((c.level ?? "").toLowerCase())) return false;
      if (topics.length && !(c.topics ?? []).some((t: string) => topics.includes(t))) return false;
      if (durations.length) {
        const h = (c.duration_minutes ?? 0) / 60;
        const ok = durations.some((d) =>
          d === "lt1" ? h < 1 : d === "1to3" ? h >= 1 && h <= 3 : h > 3,
        );
        if (!ok) return false;
      }
      if (statuses.length) {
        const e = enrolledMap.get(c.id);
        const st = !e ? "not_started" : e.completed_at ? "completed" : "in_progress";
        if (!statuses.includes(st)) return false;
      }
      if (cpdOnly && !(c.cpd_points > 0)) return false;
      if (term && !`${c.title} ${c.short_description ?? ""} ${c.description ?? ""}`.toLowerCase().includes(term))
        return false;
      return true;
    });

    const sorted = [...rows];
    sorted.sort((a: any, b: any) => {
      switch (sort) {
        case "newest":
          return String(b.created_at).localeCompare(String(a.created_at));
        case "popular":
          return (counts?.[b.id] ?? 0) - (counts?.[a.id] ?? 0);
        case "cpd":
          return (b.cpd_points ?? 0) - (a.cpd_points ?? 0);
        case "duration":
          return (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0);
        case "alpha":
          return String(a.title).localeCompare(String(b.title));
        default: {
          // Recommended: in-progress first, then not started, completed last
          const rank = (c: any) => {
            const e = enrolledMap.get(c.id);
            if (e && !e.completed_at) return 0;
            if (!e) return 1;
            return 2;
          };
          const d = rank(a) - rank(b);
          return d !== 0 ? d : (b.cpd_points ?? 0) - (a.cpd_points ?? 0);
        }
      }
    });
    return sorted;
  }, [courses, q, levels, topics, durations, statuses, cpdOnly, sort, enrolledMap, counts]);

  return (
    <>
      <PageHeader title="Course catalog" description="Browse and enrol in arbiter training courses." />

      <div className="grid lg:grid-cols-[230px_1fr] gap-6">
        <aside className="rounded-xl border border-border bg-card p-4 h-fit lg:sticky lg:top-4">
          <FilterGroup
            title="Level"
            options={LEVELS.map((l) => ({ key: l, label: l.replace(/_/g, " ") }))}
            selected={levels}
            onToggle={(k) => setLevels((s) => toggle(s, k))}
          />
          <FilterGroup
            title="Topic"
            options={TOPICS.map((t) => ({ key: t, label: t }))}
            selected={topics}
            onToggle={(k) => setTopics((s) => toggle(s, k))}
          />
          <FilterGroup
            title="Duration"
            options={DURATIONS}
            selected={durations}
            onToggle={(k) => setDurations((s) => toggle(s, k))}
          />
          <FilterGroup
            title="Status"
            options={STATUSES}
            selected={statuses}
            onToggle={(k) => setStatuses((s) => toggle(s, k))}
          />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              CPD Points
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cpdOnly}
                onChange={(e) => setCpdOnly(e.target.checked)}
                className="accent-[hsl(var(--primary))]"
              />
              Earns CPD points
            </label>
          </div>
        </aside>

        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses…"
                className="pl-9"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse h-56" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c: any) => {
                const enrolled = enrolledMap.get(c.id);
                const bookmarked = (bookmarks ?? []).includes(c.id);
                return (
                  <div
                    key={c.id}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition flex flex-col"
                  >
                    <div className="relative h-28 bg-primary/10 flex items-center justify-center">
                      {c.cover_url ? (
                        <img src={c.cover_url} alt={`${c.title} cover`} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <BookOpen className="h-7 w-7 text-primary" />
                      )}
                      <Badge className="absolute top-2 right-2 capitalize">
                        {(c.level ?? "—").replace(/_/g, " ")}
                      </Badge>
                      {user && (
                        <button
                          type="button"
                          onClick={() => bookmarkMut.mutate(c.id)}
                          title={bookmarked ? "Remove bookmark" : "Bookmark"}
                          className="absolute top-2 left-2 rounded-md bg-card/90 border border-border p-1.5"
                        >
                          <Bookmark
                            className={"h-3.5 w-3.5 " + (bookmarked ? "fill-primary text-primary" : "text-muted-foreground")}
                          />
                        </button>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition">
                        {c.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {c.short_description || c.description}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{moduleCounts?.[c.id] ?? 0} modules</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.duration_minutes ? `${(c.duration_minutes / 60).toFixed(1)} hrs` : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {c.cpd_points ?? 0} CPD
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {counts?.[c.id] ?? 0} enrolled
                        </span>
                      </div>
                      <div className="mt-auto pt-4 space-y-2">
                        {enrolled && (
                          <div className="flex items-center gap-2">
                            <Progress value={enrolled.progress_pct ?? 0} className="h-1.5 flex-1" />
                            <span className="text-[11px] text-muted-foreground">
                              {enrolled.completed_at ? "100%" : `${enrolled.progress_pct ?? 0}%`}
                            </span>
                          </div>
                        )}
                        <Button asChild className="w-full" variant={enrolled ? "default" : "outline"}>
                          <Link to="/courses/$slug" params={{ slug: c.slug ?? "" }}>
                            {enrolled?.completed_at ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Review
                              </>
                            ) : enrolled ? (
                              "Continue →"
                            ) : (
                              "Enroll free"
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No courses match your filters"
              description="Try a different keyword, level or topic."
            />
          )}
        </div>
      </div>
    </>
  );
}
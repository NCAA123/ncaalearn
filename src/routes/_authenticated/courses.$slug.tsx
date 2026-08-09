import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle2, PlayCircle, FileText, Film, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CourseDiscussion } from "@/components/course/CourseDiscussion";

export const Route = createFileRoute("/_authenticated/courses/$slug")({
  head: () => ({ meta: [{ title: "Course — NCAA Academy" }] }),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_courses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data: mods } = await supabase
        .from("academy_modules")
        .select("*")
        .eq("course_id", course!.id)
        .order("order_index", { ascending: true });
      const ids = (mods ?? []).map((m: any) => m.id);
      if (ids.length === 0) return [] as any[];
      const { data: lessons } = await supabase
        .from("academy_lessons")
        .select("*")
        .in("module_id", ids)
        .order("order_index", { ascending: true });
      return (mods ?? []).map((m: any) => ({
        ...m,
        lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id),
      }));
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", user?.id, course?.id],
    enabled: !!user && !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", course!.id)
        .maybeSingle();
      return data;
    },
  });

  const allLessonIds = (modules ?? []).flatMap((m: any) => m.lessons.map((l: any) => l.id));
  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", user?.id, course?.id],
    enabled: !!user && allLessonIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_lesson_progress")
        .select("lesson_id,completed")
        .eq("user_id", user!.id)
        .in("lesson_id", allLessonIds);
      return data ?? [];
    },
  });

  const completedSet = new Set(
    (progress ?? []).filter((p: any) => p.completed).map((p: any) => p.lesson_id as string),
  );
  const totalLessons = allLessonIds.length;
  const completedCount = completedSet.size;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const enrollMut = useMutation({
    mutationFn: async () => {
      if (!user || !course) throw new Error("Not ready");
      const { error } = await supabase
        .from("academy_enrollments")
        .insert({ user_id: user.id, course_id: course.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrolled — happy learning!");
      qc.invalidateQueries({ queryKey: ["enrollment"] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not enroll"),
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading…</div>;
  }
  if (!course) {
    return (
      <EmptyState
        title="Course not found"
        description="It may have been unpublished. Browse the catalog for available courses."
        action={
          <Button asChild variant="outline">
            <Link to="/courses">Back to catalog</Link>
          </Button>
        }
      />
    );
  }

  const firstLessonId = allLessonIds[0];
  const nextLessonId =
    allLessonIds.find((id) => !completedSet.has(id)) ?? firstLessonId;

  return (
    <>
      <Link
        to="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Catalog
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">
                {course.level ?? "—"}
              </Badge>
              {course.duration_minutes ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {Math.round(course.duration_minutes / 60) || 1}h total
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {course.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-[200px]">
            {enrollment ? (
              <>
                <Button
                  disabled={!nextLessonId}
                  onClick={() =>
                    nextLessonId &&
                    navigate({
                      to: "/courses/$slug/lessons/$lessonId",
                      params: { slug: course.slug, lessonId: nextLessonId },
                    })
                  }
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {completedCount > 0 ? "Continue" : "Start course"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  {completedCount} of {totalLessons} lessons complete
                </div>
                <Progress value={pct} className="h-1.5" />
              </>
            ) : (
              <Button onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending}>
                {enrollMut.isPending ? "Enrolling…" : "Enroll for free"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <PageHeader title="Curriculum" />
      {(modules ?? []).length === 0 ? (
        <EmptyState
          title="No modules yet"
          description="The instructor hasn't added module content. Check back soon."
        />
      ) : (
        <div className="space-y-4">
          {(modules ?? []).map((m: any, idx: number) => (
            <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </div>
                <h3 className="font-medium text-foreground">{m.title}</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {m.lessons.length} lessons
                </span>
              </div>
              <ul>
                {m.lessons.length === 0 ? (
                  <li className="px-5 py-4 text-sm text-muted-foreground">No lessons yet.</li>
                ) : (
                  m.lessons.map((l: any) => {
                    const done = completedSet.has(l.id);
                    const Icon =
                      l.content_type === "video"
                        ? Film
                        : l.content_type === "pdf"
                          ? FileText
                          : BookOpen;
                    return (
                      <li key={l.id} className="border-b border-border last:border-0">
                        {enrollment ? (
                          <Link
                            to="/courses/$slug/lessons/$lessonId"
                            params={{ slug: course.slug ?? slug, lessonId: l.id }}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                              {l.title}
                            </span>
                            {l.duration_minutes ? (
                              <span className="text-xs text-muted-foreground">
                                {l.duration_minutes} min
                              </span>
                            ) : null}
                            {done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-3 opacity-70">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                              {l.title}
                            </span>
                            {l.duration_minutes ? (
                              <span className="text-xs text-muted-foreground">
                                {l.duration_minutes} min
                              </span>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {course?.id && <CourseDiscussion courseId={course.id} />}
    </>
  );
}
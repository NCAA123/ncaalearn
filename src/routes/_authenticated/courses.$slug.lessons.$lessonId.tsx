import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page-header";
import { ArrowLeft, ArrowRight, CheckCircle2, ListTree } from "lucide-react";
import { toast } from "sonner";
import { ChessViewer } from "@/components/learning/ChessViewer";
import { LessonQuiz, type QuizSpec } from "@/components/learning/LessonQuiz";

export const Route = createFileRoute("/_authenticated/courses/$slug/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson — NCAA Academy" }] }),
  component: LessonViewer,
});

function LessonViewer() {
  const { slug, lessonId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: course } = useQuery({
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

  const { data: outline } = useQuery({
    queryKey: ["course-outline", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data: mods } = await supabase
        .from("academy_modules")
        .select("id,title,order_index")
        .eq("course_id", course!.id)
        .order("order_index", { ascending: true });
      const ids = (mods ?? []).map((m: any) => m.id);
      if (!ids.length) return { modules: [] as any[], lessons: [] as any[] };
      const { data: lessons } = await supabase
        .from("academy_lessons")
        .select("id,module_id,title,order_index")
        .in("module_id", ids)
        .order("order_index", { ascending: true });
      return { modules: mods ?? [], lessons: lessons ?? [] };
    },
  });

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress-one", user?.id, lessonId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_lesson_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      return data;
    },
  });

  const ordered = useMemo(() => {
    if (!outline) return [] as { id: string; title: string; moduleTitle: string }[];
    const modMap = new Map(outline.modules.map((m: any) => [m.id, m.title]));
    return outline.lessons.map((l: any) => ({
      id: l.id as string,
      title: l.title as string,
      moduleTitle: (modMap.get(l.module_id) as string) ?? "",
    }));
  }, [outline]);

  const idx = ordered.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const completeMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("academy_lesson_progress")
        .upsert(
          { user_id: user.id, lesson_id: lessonId, completed: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
      if (error) throw error;
      // Recompute enrollment progress %
      if (course?.id && ordered.length > 0) {
        const { data: doneRows } = await supabase
          .from("academy_lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true)
          .in(
            "lesson_id",
            ordered.map((l) => l.id),
          );
        const pct = Math.round(((doneRows?.length ?? 0) / ordered.length) * 100);
        await supabase
          .from("academy_enrollments")
          .update({
            progress_pct: pct,
            completed_at: pct === 100 ? new Date().toISOString() : null,
          })
          .eq("user_id", user.id)
          .eq("course_id", course.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-progress-one"] });
      qc.invalidateQueries({ queryKey: ["lesson-progress"] });
      qc.invalidateQueries({ queryKey: ["enrollment"] });
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save progress"),
  });

  // Track open time
  useEffect(() => {
    if (!user) return;
    const started = Date.now();
    return () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds > 2) {
        void supabase
          .from("academy_lesson_progress")
          .upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              seconds_spent: (progress?.seconds_spent ?? 0) + seconds,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id" },
          );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user?.id]);

  if (lessonLoading) return <div className="text-muted-foreground">Loading lesson…</div>;
  if (!lesson) {
    return (
      <EmptyState
        title="Lesson not found"
        description="It may have been removed."
        action={
          <Button asChild variant="outline">
            <Link to="/courses/$slug" params={{ slug }}>Back to course</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div>
        <Link
          to="/courses/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="capitalize">
            {lesson.content_type ?? "text"}
          </Badge>
          {lesson.duration_minutes ? (
            <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-5">
          {lesson.title}
        </h1>

        <LessonContent
          lesson={lesson}
          onQuizPassed={() => {
            if (!progress?.completed) completeMut.mutate();
          }}
        />

        <div className="mt-8 flex flex-wrap items-center gap-3 justify-between border-t border-border pt-5">
          <Button
            variant="outline"
            disabled={!prev}
            onClick={() =>
              prev &&
              navigate({
                to: "/courses/$slug/lessons/$lessonId",
                params: { slug, lessonId: prev.id },
              })
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
          </Button>

          <Button
            variant={progress?.completed ? "secondary" : "default"}
            onClick={() => completeMut.mutate()}
            disabled={completeMut.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {progress?.completed ? "Completed" : "Mark complete"}
          </Button>

          <Button
            disabled={!next}
            onClick={() => {
              if (!progress?.completed) completeMut.mutate();
              if (next) {
                navigate({
                  to: "/courses/$slug/lessons/$lessonId",
                  params: { slug, lessonId: next.id },
                });
              }
            }}
          >
            Next <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 self-start rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{course?.title ?? "Course"}</span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {ordered.map((l, i) => (
            <li key={l.id}>
              <Link
                to="/courses/$slug/lessons/$lessonId"
                params={{ slug, lessonId: l.id }}
                className={
                  "flex items-start gap-2 px-4 py-2.5 text-xs border-b border-border last:border-0 transition " +
                  (l.id === lessonId
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")
                }
              >
                <span className="font-mono opacity-60 mt-0.5">{i + 1}.</span>
                <span className="line-clamp-2">{l.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function LessonContent({
  lesson,
  onQuizPassed,
}: {
  lesson: any;
  onQuizPassed?: () => void;
}) {
  const type = (lesson.content_type ?? "text") as string;

  if (type === "video" && lesson.video_url) {
    const url = lesson.video_url as string;
    const yt = extractYouTubeId(url);
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        {yt ? (
          <iframe
            src={`https://www.youtube.com/embed/${yt}`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <video src={url} controls className="w-full h-full" />
        )}
      </div>
    );
  }

  if (type === "pdf" && lesson.pdf_url) {
    return (
      <div className="h-[75vh] rounded-xl border border-border overflow-hidden bg-muted">
        <iframe src={lesson.pdf_url} title={lesson.title} className="w-full h-full" />
      </div>
    );
  }

  if (type === "chess" && lesson.pgn) {
    return (
      <div className="space-y-4">
        {lesson.body ? (
          <article className="prose prose-sm max-w-none text-foreground">
            <div className="whitespace-pre-wrap leading-relaxed">{lesson.body}</div>
          </article>
        ) : null}
        <ChessViewer pgn={lesson.pgn as string} />
      </div>
    );
  }

  if (type === "quiz" && lesson.quiz) {
    const spec = lesson.quiz as QuizSpec;
    return (
      <div className="space-y-4">
        {lesson.body ? (
          <article className="prose prose-sm max-w-none text-foreground">
            <div className="whitespace-pre-wrap leading-relaxed">{lesson.body}</div>
          </article>
        ) : null}
        <LessonQuiz quiz={spec} onPassed={() => onQuizPassed?.()} />
      </div>
    );
  }

  return (
    <article className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary">
      {lesson.body ? (
        <div className="whitespace-pre-wrap leading-relaxed">{lesson.body}</div>
      ) : (
        <p className="text-muted-foreground italic">No content has been added to this lesson yet.</p>
      )}
    </article>
  );
}

function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  return m ? m[1] : null;
}
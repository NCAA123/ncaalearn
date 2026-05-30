import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-learning")({
  head: () => ({ meta: [{ title: "My Learning — NCAA Academy" }] }),
  component: MyLearningPage,
});

function MyLearningPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-learning", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("academy_enrollments")
        .select(
          "id,progress_pct,completed_at,enrolled_at,course:academy_courses(id,title,slug,description,level,cover_url)",
        )
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      return rows ?? [];
    },
  });

  const inProgress = (data ?? []).filter((r: any) => !r.completed_at);
  const completed = (data ?? []).filter((r: any) => r.completed_at);

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

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="You haven't enrolled in a course yet"
          description="Browse the catalog and start with a course that matches your level."
          action={
            <Button asChild>
              <Link to="/courses">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                In progress
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {inProgress.map((r: any) => (
                  <EnrollmentCard key={r.id} row={r} />
                ))}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Completed
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {completed.map((r: any) => (
                  <EnrollmentCard key={r.id} row={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function EnrollmentCard({ row }: { row: any }) {
  const c = row.course;
  if (!c) return null;
  const done = !!row.completed_at;
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: c.slug }}
      className="rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <BookOpen className="h-5 w-5" />
        </div>
        {done ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <PlayCircle className="h-3 w-3" /> {row.progress_pct ?? 0}%
          </Badge>
        )}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.level}</div>
      <h3 className="font-semibold text-foreground mt-1">{c.title}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
      {!done && (
        <div className="mt-4">
          <Progress value={row.progress_pct ?? 0} className="h-1.5" />
        </div>
      )}
    </Link>
  );
}
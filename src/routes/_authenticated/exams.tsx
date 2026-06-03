import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, FileQuestion, Target } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { listPublishedExams } from "@/lib/exam.functions";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Examinations — NCAA Academy" }] }),
  component: ExamsList,
});

function ExamsList() {
  const listFn = useServerFn(listPublishedExams);
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-exams"],
    queryFn: () => listFn(),
  });

  return (
    <div>
      <PageHeader
        title="Examinations"
        description="Sit certification and recertification exams. Once started, the timer cannot be paused."
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No exams available" description="Check back soon — new exams are added regularly." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((e) => (
            <li key={e.id}>
              <Link
                to="/exams/$examId"
                params={{ examId: e.id }}
                className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="uppercase text-[10px]">{e.level}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {e.duration_minutes} min
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> Pass {e.pass_score}%
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  {e.title}
                </h3>
                {e.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
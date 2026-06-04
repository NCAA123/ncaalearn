import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAttemptResult } from "@/lib/cert.functions";

export const Route = createFileRoute("/_authenticated/exams/$examId/result/$attemptId")({
  head: () => ({ meta: [{ title: "Exam Result — NCAA Academy" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { examId, attemptId } = Route.useParams();
  const fn = useServerFn(getAttemptResult);
  const { data, isLoading } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => fn({ data: { attemptId } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;

  const attempt = data.attempt as {
    score: number | null;
    passed: boolean | null;
    status: string;
    submitted_at: string | null;
    violation_count: number | null;
  };
  const exam = data.exam as { title: string; pass_score: number };
  const answersByQ = new Map(
    data.answers.map((a) => [(a as { question_id: string }).question_id, a as {
      answer: unknown; is_correct: boolean | null; points_awarded: number | null;
    }]),
  );

  return (
    <div>
      <PageHeader
        title={exam?.title ?? "Result"}
        description={`Attempt submitted ${attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "—"}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/exams/$examId" params={{ examId }}>Back to exam</Link>
          </Button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatBox
          label="Score"
          value={attempt.score != null ? `${attempt.score}%` : "—"}
          icon={attempt.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
        />
        <StatBox label="Pass mark" value={`${exam?.pass_score ?? 70}%`} icon={<Clock className="h-5 w-5 text-muted-foreground" />} />
        <StatBox
          label="Status"
          value={attempt.status === "needs_grading" ? "Awaiting grading" : attempt.passed ? "Passed" : "Failed"}
          icon={attempt.status === "needs_grading" ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : null}
        />
      </div>

      {(attempt.violation_count ?? 0) > 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-medium">{attempt.violation_count} integrity violation(s) recorded</div>
            <div className="text-muted-foreground">Tab switches, copy/paste, or fullscreen exits during the attempt.</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.questions.map((q, i) => {
          const row = q as {
            id: string; question_type: string; question_text: string;
            options: string[] | null; correct_answer: unknown; points: number;
          };
          const a = answersByQ.get(row.id);
          const isEssay = row.question_type === "essay";
          const correct = a?.is_correct;
          return (
            <div key={row.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="font-medium">Q{i + 1}. {row.question_text}</div>
                <Badge variant={correct ? "default" : isEssay && a == null ? "outline" : "secondary"}>
                  {a?.points_awarded ?? 0} / {row.points} pts
                </Badge>
              </div>
              {isEssay ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  <span className="text-xs uppercase tracking-wider">Your answer</span>
                  <div className="mt-1 text-foreground">{(a?.answer as string) || <em>No answer</em>}</div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Your answer: </span>
                    <span className={correct ? "text-emerald-600 font-medium" : "text-destructive"}>
                      {formatAnswer(a?.answer, row.options)}
                    </span>
                  </div>
                  {!correct && (
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">Correct: </span>
                      <span className="text-emerald-600">{formatAnswer(row.correct_answer, row.options)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function formatAnswer(value: unknown, options: string[] | null): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    return value.map((v) => formatAnswer(v, options)).join(", ");
  }
  if (typeof value === "string" || typeof value === "number") {
    const idx = Number(value);
    if (options && Number.isInteger(idx) && options[idx] != null) return options[idx];
    return String(value);
  }
  if (typeof value === "boolean") return value ? "True" : "False";
  return JSON.stringify(value);
}
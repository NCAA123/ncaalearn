import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertTriangle, Clock, Target, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { toast } from "sonner";
import { getExamForCandidate, startAttempt } from "@/lib/exam.functions";

export const Route = createFileRoute("/_authenticated/exams/$examId")({
  head: () => ({ meta: [{ title: "Exam — NCAA Academy" }] }),
  component: ExamIntro,
});

function ExamIntro() {
  const { examId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getExamForCandidate);
  const { data, isLoading } = useQuery({
    queryKey: ["exam-intro", examId],
    queryFn: () => getFn({ data: { examId } }),
  });

  const startFn = useServerFn(startAttempt);
  const startMut = useMutation({
    mutationFn: () => startFn({ data: { examId } }),
    onSuccess: (res) =>
      navigate({ to: "/exams/$examId/attempt", params: { examId }, search: { attemptId: res.attemptId } as never }),
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) {
    return (
      <EmptyState
        title="Exam not found"
        action={<Button asChild variant="outline"><Link to="/exams">Back to exams</Link></Button>}
      />
    );
  }

  const { exam, attempts } = data as {
    exam: { id: string; title: string; description: string | null; level: string; duration_minutes: number; pass_score: number };
    attempts: { id: string; started_at: string; submitted_at: string | null; score: number | null; passed: boolean | null; status: string }[];
  };
  const inProgress = attempts.find((a) => a.status === "in_progress");

  return (
    <div className="max-w-3xl">
      <Link to="/exams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>
      <PageHeader title={exam.title} description={exam.description ?? undefined} />

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3.5 w-3.5" /> Duration</div>
          <div className="text-lg font-semibold">{exam.duration_minutes} min</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Target className="h-3.5 w-3.5" /> Passing score</div>
          <div className="text-lg font-semibold">{exam.pass_score}%</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Level</div>
          <Badge variant="outline" className="uppercase">{exam.level}</Badge>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Integrity rules</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>The exam runs in fullscreen. Leaving fullscreen is logged.</li>
              <li>Switching tabs, opening other windows, or copy/paste is logged.</li>
              <li>The timer continues regardless of disconnects. Reconnect to resume.</li>
              <li>Repeated violations may invalidate your attempt.</li>
            </ul>
          </div>
        </div>
      </div>

      {attempts.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="font-semibold mb-3">Your attempts</h3>
          <ul className="space-y-2 text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{new Date(a.started_at).toLocaleString()}</span>
                <span className="flex items-center gap-2">
                  {a.score != null ? <Badge variant="outline">{a.score}%</Badge> : null}
                  <Badge variant={a.passed ? "default" : a.status === "in_progress" ? "secondary" : "outline"} className="capitalize">
                    {a.status.replace("_", " ")}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button size="lg" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
        <AlertTriangle className="h-4 w-4 mr-2" />
        {inProgress ? "Resume attempt" : startMut.isPending ? "Starting…" : "Start exam"}
      </Button>
    </div>
  );
}
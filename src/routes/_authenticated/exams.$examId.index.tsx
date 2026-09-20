import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ListChecks,
  ShieldAlert,
  Target,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { toast } from "sonner";
import { getExamPreflight, startAttempt } from "@/lib/exam.functions";

export const Route = createFileRoute("/_authenticated/exams/$examId/")({
  head: () => ({
    meta: [
      { title: "Certification exam — NCAA Academy" },
      { name: "description", content: "Review the exam rules and pre-flight checks before starting your NCAA arbiter certification examination." },
    ],
  }),
  component: ExamIntro,
});

const CONSENTS = [
  "I am in a quiet, private location.",
  "I will not use any external resources.",
  "I have read and agree to the exam rules.",
];

function ExamIntro() {
  const { examId } = Route.useParams();
  const navigate = useNavigate();
  const preflightFn = useServerFn(getExamPreflight);
  const { data, isLoading } = useQuery({
    queryKey: ["exam-intro", examId],
    queryFn: () => preflightFn({ data: { examId } }),
  });

  const [agreed, setAgreed] = useState<boolean[]>([false, false, false]);
  const allAgreed = agreed.every(Boolean);

  const startFn = useServerFn(startAttempt);
  const startMut = useMutation({
    mutationFn: () => startFn({ data: { examId } }),
    onSuccess: (res) =>
      navigate({
        to: "/exams/$examId/attempt",
        params: { examId },
        search: { attemptId: res.attemptId } as never,
      }),
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

  const { exam, checks, attempts, inProgressAttemptId, attemptNumber, maxAttempts, cooldownHours, questionCount, canStart } = data;
  const blockers = checks.filter((c) => !c.ok);

  return (
    <div className="max-w-3xl">
      <Link to="/exams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>
      <PageHeader title={exam.title} description={exam.description ?? undefined} />

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={`${exam.duration_minutes} min`} />
        <Stat icon={<ListChecks className="h-3.5 w-3.5" />} label="Questions" value={String(questionCount)} />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Pass mark" value={`${exam.pass_score}%`} />
        <Stat label="Level" value={exam.level.toUpperCase()} />
      </div>

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="font-semibold mb-3">Instructions</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>You have {exam.duration_minutes} minutes to complete this examination.</li>
          <li>There are {questionCount} questions. Pass mark: {exam.pass_score}%.</li>
          <li>Once started, the timer cannot be paused and keeps running if you disconnect.</li>
          <li>Do not switch tabs or windows — switching is logged and repeated switching flags your attempt.</li>
          <li>You may flag questions and revisit them before submitting.</li>
          {exam.instructions ? <li>{exam.instructions}</li> : null}
        </ul>
        <p className="text-sm mt-3">
          This attempt will be attempt <strong>{attemptNumber}</strong> of <strong>{maxAttempts}</strong> allowed.
          {cooldownHours > 0 ? ` You must wait ${cooldownHours} hours between attempts.` : ""}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="font-semibold mb-3">Pre-flight checks</h3>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2.5 text-sm">
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              )}
              <span>
                <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
                {!c.ok && c.reason ? (
                  <span className="block text-muted-foreground text-xs mt-0.5">
                    {c.reason} {c.guidance}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Integrity rules</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Tab switches, window blur, copy/paste and developer tools are logged.</li>
              <li>Three violations trigger a warning; ten flag your attempt for review.</li>
              <li>Twenty violations auto-submit your exam pending admin review.</li>
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
                  {a.status !== "in_progress" ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/exams/$examId/result/$attemptId" params={{ examId, attemptId: a.id }}>Result</Link>
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Declaration</h3>
        <div className="space-y-2.5 mb-5">
          {CONSENTS.map((text, i) => (
            <label key={text} className="flex items-start gap-2.5 text-sm cursor-pointer">
              <Checkbox
                checked={agreed[i]}
                onCheckedChange={(v) =>
                  setAgreed((prev) => prev.map((p, idx) => (idx === i ? v === true : p)))
                }
              />
              <span className="text-muted-foreground">{text}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/exams">Cancel</Link></Button>
          <Button
            size="lg"
            disabled={(!canStart && !inProgressAttemptId) || !allAgreed || startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            {startMut.isPending
              ? "Preparing…"
              : inProgressAttemptId
                ? "Resume examination →"
                : "Start Examination →"}
          </Button>
        </div>
        {!canStart && !inProgressAttemptId ? (
          <p className="text-xs text-destructive mt-3">
            {blockers[0]?.reason ?? "You do not currently meet the requirements for this exam."}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">{icon}{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

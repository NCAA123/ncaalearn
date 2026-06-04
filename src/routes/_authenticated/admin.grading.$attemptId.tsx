import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAttemptResult, gradeEssayAnswer, finalizeGrading } from "@/lib/cert.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/grading/$attemptId")({
  head: () => ({ meta: [{ title: "Grade Attempt — Admin" }] }),
  component: GradeAttempt,
});

function GradeAttempt() {
  const { attemptId } = Route.useParams();
  const { isStaff } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getAttemptResult);
  const gradeFn = useServerFn(gradeEssayAnswer);
  const finalizeFn = useServerFn(finalizeGrading);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grade-attempt", attemptId],
    queryFn: () => getFn({ data: { attemptId } }),
    enabled: isStaff,
  });

  const finalize = useMutation({
    mutationFn: () => finalizeFn({ data: { attemptId } }),
    onSuccess: (r) => {
      toast.success(`Finalized — ${r.scorePct}% (${r.passed ? "passed" : "failed"})`);
      qc.invalidateQueries({ queryKey: ["grading-queue"] });
      nav({ to: "/admin/grading" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isStaff) return <PageHeader title="Grading" description="Staff access only." />;
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const exam = data.exam as { title: string };
  const answersByQ = new Map(
    data.answers.map((a) => [(a as { question_id: string }).question_id, a as {
      question_id: string; answer: unknown; points_awarded: number | null;
    }]),
  );
  const essays = data.questions.filter((q) => (q as { question_type: string }).question_type === "essay");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/grading"><ArrowLeft className="h-4 w-4" /> Back to queue</Link>
        </Button>
        <Button onClick={() => finalize.mutate()} disabled={finalize.isPending}>
          {finalize.isPending ? "Finalizing…" : "Finalize grading"}
        </Button>
      </div>
      <PageHeader title={`Grade: ${exam?.title ?? "Exam"}`} description="Assign points for each essay answer, then finalize to compute final score and issue certificate if passed." />

      <div className="space-y-4">
        {essays.length === 0 && <p className="text-sm text-muted-foreground">No essay questions in this attempt.</p>}
        {essays.map((q, i) => {
          const row = q as { id: string; question_text: string; points: number };
          const ans = answersByQ.get(row.id);
          return (
            <EssayCard
              key={row.id}
              index={i + 1}
              question={row.question_text}
              maxPoints={row.points}
              currentPoints={ans?.points_awarded ?? 0}
              answerText={(ans?.answer as string) ?? ""}
              answerId={(ans as { question_id: string; answer: unknown; points_awarded: number | null } | undefined) ? undefined : undefined}
              onSave={async (pts) => {
                if (!ans) {
                  toast.error("No answer submitted for this question");
                  return;
                }
                // need answer row id — refetch via second select
                const rec = (data.answers.find(
                  (a) => (a as { question_id: string }).question_id === row.id,
                ) as { id?: string }) ?? null;
                if (!rec || !rec.id) {
                  // getAttemptResult only returns question_id; pull id by re-fetching
                  toast.error("Missing answer id — reload page");
                  return;
                }
                await gradeFn({ data: { answerId: rec.id, pointsAwarded: pts } });
                toast.success("Saved");
                refetch();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function EssayCard({
  index, question, maxPoints, currentPoints, answerText, onSave,
}: {
  index: number; question: string; maxPoints: number; currentPoints: number;
  answerText: string; answerId?: string; onSave: (pts: number) => Promise<void>;
}) {
  const [pts, setPts] = useState(String(currentPoints));
  const [saving, setSaving] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-medium">Q{index}. {question}</div>
        <Badge variant="outline">Max {maxPoints}</Badge>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap mb-3">
        {answerText || <em className="text-muted-foreground">No answer submitted</em>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number" min={0} max={maxPoints} step={1}
          value={pts} onChange={(e) => setPts(e.target.value)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">/ {maxPoints} pts</span>
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            const n = Math.max(0, Math.min(maxPoints, Number(pts) || 0));
            setSaving(true);
            try { await onSave(n); } finally { setSaving(false); }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
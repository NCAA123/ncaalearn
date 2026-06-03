import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  // index of the correct choice
  answer: number;
  explanation?: string;
};

export type QuizSpec = {
  pass_pct?: number; // default 70
  questions: QuizQuestion[];
};

export function LessonQuiz({
  quiz,
  onPassed,
}: {
  quiz: QuizSpec;
  onPassed?: (scorePct: number) => void;
}) {
  const passPct = quiz.pass_pct ?? 70;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const total = quiz.questions.length;
  const correct = quiz.questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0),
    0,
  );
  const scorePct = total ? Math.round((correct / total) * 100) : 0;
  const passed = scorePct >= passPct;

  function submit() {
    setSubmitted(true);
    if (scorePct >= passPct) onPassed?.(scorePct);
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-5">
      {quiz.questions.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <div key={qi} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2 mb-3">
              <Badge variant="outline" className="font-mono">Q{qi + 1}</Badge>
              <p className="text-sm font-medium text-foreground leading-relaxed">{q.prompt}</p>
            </div>
            <div className="grid gap-2">
              {q.choices.map((c, ci) => {
                const isChosen = chosen === ci;
                const isCorrect = q.answer === ci;
                const showState = submitted && (isChosen || isCorrect);
                const cls = showState
                  ? isCorrect
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : isChosen
                      ? "border-destructive/60 bg-destructive/10"
                      : "border-border"
                  : isChosen
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40";
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                    className={`text-left text-sm rounded-lg border px-3 py-2 transition flex items-center gap-2 ${cls}`}
                  >
                    {submitted && isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : submitted && isChosen && !isCorrect ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <span className="font-mono text-xs opacity-50 w-4">{String.fromCharCode(65 + ci)}.</span>
                    )}
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation ? (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{q.explanation}</p>
            ) : null}
          </div>
        );
      })}

      {submitted ? (
        <div
          className={
            "rounded-xl border p-4 flex items-center justify-between gap-3 " +
            (passed
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-destructive/40 bg-destructive/10")
          }
        >
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {passed ? "Passed" : "Not yet"} — {correct}/{total} correct ({scorePct}%)
            </p>
            <p className="text-xs text-muted-foreground">Passing score: {passPct}%</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Try again
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button onClick={submit} disabled={Object.keys(answers).length !== total}>
            Submit quiz
          </Button>
        </div>
      )}
    </div>
  );
}
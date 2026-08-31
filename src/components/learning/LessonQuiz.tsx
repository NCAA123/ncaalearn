import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { gradeLessonQuiz } from "@/lib/quiz.functions";

// Note: this spec intentionally carries no correct-answer index or
// explanation — those stay server-side until grading, see
// src/lib/quiz.functions.ts.
export type QuizQuestion = {
  prompt: string;
  choices: string[];
};

export type QuizSpec = {
  pass_pct?: number;
  questions: QuizQuestion[];
};

type GradedResult = {
  correctIndex: number;
  chosen: number | null;
  isCorrect: boolean;
  explanation: string | null;
};

type GradeResponse = { results: GradedResult[]; scorePct: number; passed: boolean; passPct: number };

export function LessonQuiz({
  lessonId,
  quiz,
  onPassed,
}: {
  lessonId: string;
  quiz: QuizSpec;
  onPassed?: (scorePct: number) => void;
}) {
  const gradeFn = useServerFn(gradeLessonQuiz);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);

  const total = quiz.questions.length;

  async function submit() {
    setGrading(true);
    try {
      const graded = await gradeFn({ data: { lessonId, answers } });
      setResult(graded);
      if (graded.passed) onPassed?.(graded.scorePct);
    } finally {
      setGrading(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className="space-y-5">
      {quiz.questions.map((q, qi) => {
        const chosen = answers[qi];
        const graded = result?.results[qi];
        return (
          <div key={qi} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2 mb-3">
              <Badge variant="outline" className="font-mono">Q{qi + 1}</Badge>
              <p className="text-sm font-medium text-foreground leading-relaxed">{q.prompt}</p>
            </div>
            <div className="grid gap-2">
              {q.choices.map((c, ci) => {
                const isChosen = chosen === ci;
                const isCorrectChoice = graded ? graded.correctIndex === ci : false;
                const showState = !!graded && (isChosen || isCorrectChoice);
                const cls = showState
                  ? isCorrectChoice
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
                    disabled={!!result}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                    className={`text-left text-sm rounded-lg border px-3 py-2 transition flex items-center gap-2 ${cls}`}
                  >
                    {graded && isCorrectChoice ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : graded && isChosen && !isCorrectChoice ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <span className="font-mono text-xs opacity-50 w-4">{String.fromCharCode(65 + ci)}.</span>
                    )}
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
            {graded?.explanation ? (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{graded.explanation}</p>
            ) : null}
          </div>
        );
      })}

      {result ? (
        <div
          className={
            "rounded-xl border p-4 flex items-center justify-between gap-3 " +
            (result.passed
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-destructive/40 bg-destructive/10")
          }
        >
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {result.passed ? "Passed" : "Not yet"} —{" "}
              {result.results.filter((r) => r.isCorrect).length}/{total} correct ({result.scorePct}%)
            </p>
            <p className="text-xs text-muted-foreground">Passing score: {result.passPct}%</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Try again
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button onClick={submit} disabled={grading || Object.keys(answers).length !== total}>
            {grading ? "Grading…" : "Submit quiz"}
          </Button>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Flame, Layers, Target, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChessViewer } from "@/components/learning/ChessViewer";
import {
  getPracticeStats,
  listPracticeCategories,
  startPracticeSet,
  submitPracticeAnswer,
} from "@/lib/practice.functions";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [{ title: "Practice — NCAA Academy" }] }),
  component: PracticePage,
});

type Question = {
  id: string;
  question_type: "mcq" | "multi" | "tf";
  question_text: string;
  options: string[] | null;
  category: string | null;
  sub_category: string | null;
  difficulty: string | null;
  scenario_text: string | null;
  image_url: string | null;
  fen: string | null;
  pgn: string | null;
  board_instructions: string | null;
};

type Answered = { question: Question; chosen: unknown; isCorrect: boolean; correctAnswer: unknown; explanation: string | null };

function PracticePage() {
  const qc = useQueryClient();
  const statsFn = useServerFn(getPracticeStats);
  const categoriesFn = useServerFn(listPracticeCategories);
  const startFn = useServerFn(startPracticeSet);
  const answerFn = useServerFn(submitPracticeAnswer);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["practice-stats"],
    queryFn: () => statsFn(),
  });
  const { data: categories } = useQuery({
    queryKey: ["practice-categories"],
    queryFn: () => categoriesFn(),
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [count, setCount] = useState(10);

  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAnswer: unknown; explanation: string | null } | null>(null);
  const [results, setResults] = useState<Answered[]>([]);

  const start = useMutation({
    mutationFn: (categories?: string[]) => startFn({ data: { count, categories } }),
    onSuccess: (qs) => {
      if (qs.length === 0) {
        toast.error("No practice questions available yet for this selection.");
        return;
      }
      setSession(qs as Question[]);
      setIndex(0);
      setChosen(null);
      setFeedback(null);
      setResults([]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start practice session.");
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      const q = session![index];
      return answerFn({ data: { questionId: q.id, answer: chosen } });
    },
    onSuccess: (res) => {
      setFeedback(res);
      setResults((r) => [...r, { question: session![index], chosen, isCorrect: res.isCorrect, correctAnswer: res.correctAnswer, explanation: res.explanation }]);
    },
  });

  function next() {
    if (!session) return;
    if (index + 1 >= session.length) {
      setSession(null);
      qc.invalidateQueries({ queryKey: ["practice-stats"] });
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    setFeedback(null);
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((cs) => (cs.includes(cat) ? cs.filter((c) => c !== cat) : [...cs, cat]));
  }

  // ── Session complete: summary ──────────────────────────────────────
  if (results.length > 0 && !session) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    return (
      <div>
        <PageHeader title="Session complete" description={`${correctCount}/${results.length} correct`} />
        <div className="space-y-3 max-w-2xl">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                {r.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-foreground">{r.question.question_text}</p>
              </div>
              {!r.isCorrect && r.explanation && (
                <p className="text-xs text-muted-foreground mt-2 ml-6 rounded-md bg-muted/50 px-2 py-1.5">{r.explanation}</p>
              )}
            </div>
          ))}
        </div>
        <Button className="mt-5" onClick={() => setResults([])}>
          Back to practice
        </Button>
      </div>
    );
  }

  // ── Active session ───────────────────────────────────────────────
  if (session) {
    const q = session[index];
    const isMulti = q.question_type === "multi";
    const choices = q.question_type === "tf" ? ["True", "False"] : q.options ?? [];

    function pick(optIndex: number) {
      if (feedback) return;
      if (isMulti) {
        const arr = Array.isArray(chosen) ? [...(chosen as number[])] : [];
        setChosen(arr.includes(optIndex) ? arr.filter((v) => v !== optIndex) : [...arr, optIndex]);
      } else {
        setChosen(optIndex);
      }
    }

    return (
      <div>
        <PageHeader title="Practice session" description={`Question ${index + 1} of ${session.length}`} />
        <div className="max-w-2xl rounded-xl border border-border bg-card p-5 space-y-4">
          {q.category && <Badge variant="outline">{q.category}</Badge>}
          {q.scenario_text && <p className="text-sm text-muted-foreground italic">{q.scenario_text}</p>}
          <p className="text-sm font-medium text-foreground leading-relaxed">{q.question_text}</p>

          {(q.fen || q.pgn) && (
            <div>
              {q.board_instructions && (
                <p className="text-xs text-muted-foreground mb-2">{q.board_instructions}</p>
              )}
              <ChessViewer pgn={q.pgn ?? ""} startFen={q.fen} />
            </div>
          )}

          <div className="grid gap-2">
            {choices.map((c, ci) => {
              const optValue = q.question_type === "tf" ? ci === 0 : ci;
              const isChosen = isMulti ? Array.isArray(chosen) && (chosen as number[]).includes(ci) : chosen === optValue;
              const isCorrectChoice = feedback && (isMulti ? Array.isArray(feedback.correctAnswer) && (feedback.correctAnswer as number[]).includes(ci) : feedback.correctAnswer === optValue);
              const showState = !!feedback && (isChosen || isCorrectChoice);
              return (
                <button
                  key={ci}
                  type="button"
                  disabled={!!feedback}
                  onClick={() => pick(optValue as number)}
                  className={
                    "text-left text-sm rounded-lg border px-3 py-2 transition " +
                    (showState
                      ? isCorrectChoice
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : isChosen
                          ? "border-destructive/60 bg-destructive/10"
                          : "border-border"
                      : isChosen
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/40")
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className={"rounded-lg border px-3 py-2 text-xs " + (feedback.isCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-destructive/40 bg-destructive/10 text-destructive")}>
              {feedback.isCorrect ? "Correct!" : "Not quite."}
              {feedback.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
            </div>
          )}

          <div className="flex justify-end">
            {feedback ? (
              <Button onClick={next}>{index + 1 >= session.length ? "Finish" : "Next question"}</Button>
            ) : (
              <Button
                onClick={() => submit.mutate()}
                disabled={chosen == null || (isMulti && Array.isArray(chosen) && chosen.length === 0) || submit.isPending}
              >
                {submit.isPending ? "Checking…" : "Submit answer"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Practice" description="Drill the question bank outside of a timed exam." />

      {loadingStats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Answered" value={stats?.total ?? 0} icon={Layers} />
          <StatCard label="Correct" value={stats?.correct ?? 0} icon={CheckCircle2} tone="success" />
          <StatCard label="Average" value={`${stats?.averagePct ?? 0}%`} icon={Target} />
          <StatCard label="Streak" value={`${stats?.streak ?? 0}d`} icon={Flame} tone="warning" />
        </div>
      )}

      {!!stats?.topics.length && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground mb-3">Performance by topic</h3>
          <div className="space-y-2">
            {stats.topics.map((t) => (
              <div key={t.category} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 truncate">{t.category}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={"h-full rounded-full " + (t.pct < 70 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 max-w-2xl space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Start a session</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Questions:</span>
          {[10, 20, 50].map((n) => (
            <Button key={n} size="sm" variant={count === n ? "default" : "outline"} onClick={() => setCount(n)}>
              {n}
            </Button>
          ))}
        </div>

        {!!categories?.length && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Topics (leave empty for all)</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={
                    "text-xs rounded-full border px-2.5 py-1 transition " +
                    (selectedCategories.includes(c) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={() => start.mutate(selectedCategories.length ? selectedCategories : undefined)} disabled={start.isPending}>
          {start.isPending ? "Loading…" : "Start practice"}
        </Button>
      </div>
    </div>
  );
}

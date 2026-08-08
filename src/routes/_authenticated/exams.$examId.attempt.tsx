import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Clock, Send, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAttemptRuntime,
  recordViolation,
  saveAnswer,
  submitAttempt,
} from "@/lib/exam.functions";

const search = z.object({ attemptId: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/exams/$examId/attempt")({
  head: () => ({ meta: [{ title: "Exam in progress — NCAA Academy" }] }),
  validateSearch: search,
  component: AttemptRuntime,
});

type Question = {
  id: string;
  question_type: "mcq" | "multi" | "tf" | "essay";
  question_text: string;
  options: string[] | null;
  points: number;
};

function AttemptRuntime() {
  const { examId } = Route.useParams();
  const { attemptId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getAttemptRuntime);
  const { data, isLoading } = useQuery({
    queryKey: ["attempt-runtime", attemptId],
    queryFn: () => getFn({ data: { attemptId } }),
  });

  const exam = data?.exam as { duration_minutes: number; title: string; pass_score: number } | undefined;
  const attempt = data?.attempt as { started_at: string; status: string } | undefined;
  const questions = (data?.questions ?? []) as Question[];
  const initialAnswers = (data?.answers ?? {}) as Record<string, unknown>;

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ scorePct: number; passed: boolean; needsManual: boolean } | null>(null);

  useEffect(() => {
    if (data) setAnswers(initialAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Anti-cheating ───────────────────────────────────────────────
  const violateFn = useServerFn(recordViolation);
  const autoSubmitRef = useRef(false);
  const violateMut = useMutation({
    mutationFn: violateFn,
    onSuccess: (res) => {
      if (res.autoSubmit && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        toast.error("Too many integrity violations — your exam is being submitted.");
        submitRef.current?.();
      } else if (res.flagged) {
        toast.error(`${res.count} violations logged. This attempt is flagged for review.`);
      } else if (res.warn) {
        toast.warning(`${res.count} violations logged. Further violations may end your exam.`);
      }
    },
  });
  const violate = useCallback(
    (kind: string, detail?: string) => {
      if (result || attempt?.status !== "in_progress") return;
      violateMut.mutate({ data: { attemptId, kind, detail } });
    },
    [attemptId, attempt?.status, result, violateMut],
  );

  useEffect(() => {
    if (!data || result) return;
    const onVis = () => { if (document.hidden) violate("tab_hidden"); };
    const onBlur = () => violate("window_blur");
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); violate("copy"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); violate("paste"); };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const onFs = () => { if (!document.fullscreenElement) violate("exit_fullscreen"); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && ["c", "v", "p", "s", "u"].includes(k))) {
        e.preventDefault();
        violate("shortcut", e.key);
      }
    };
    let devtoolsSeen = false;
    const devtoolsTimer = setInterval(() => {
      const open =
        window.outerWidth - window.innerWidth > 200 ||
        window.outerHeight - window.innerHeight > 220;
      if (open && !devtoolsSeen) { devtoolsSeen = true; violate("devtools"); }
      if (!open) devtoolsSeen = false;
    }, 3000);

    // Idle tracking: 2 minutes → warning, 5 minutes → auto-submit.
    let lastActive = Date.now();
    let warned = false;
    const bump = () => { lastActive = Date.now(); warned = false; };
    const idleTimer = setInterval(() => {
      const idleMs = Date.now() - lastActive;
      if (idleMs > 5 * 60_000 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        toast.error("Inactive for 5 minutes — submitting your exam.");
        submitRef.current?.();
      } else if (idleMs > 2 * 60_000 && !warned) {
        warned = true;
        toast.warning("You have been inactive for 2 minutes.");
      }
    }, 15_000);
    ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
      window.addEventListener(ev, bump, { passive: true }),
    );
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(devtoolsTimer);
      clearInterval(idleTimer);
      ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
        window.removeEventListener(ev, bump),
      );
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [data, result, violate]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  const submitRef = useRef<(() => void) | null>(null);

  // ── Timer ──────────────────────────────────────────────────────
  const deadlineMs = useMemo(() => {
    if (!attempt || !exam) return null;
    return new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000;
  }, [attempt, exam]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remainingSec = deadlineMs ? Math.max(0, Math.floor((deadlineMs - now) / 1000)) : null;

  // ── Save answers (debounced per question) ──────────────────────
  const saveFn = useServerFn(saveAnswer);
  // The server throttles attempt writes to 1 request/second, so answers are
  // queued and flushed sequentially with >1s spacing (latest value per question wins).
  const pending = useRef<Map<string, unknown>>(new Map());
  const flushing = useRef(false);
  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (pending.current.size > 0) {
        const [qid, value] = pending.current.entries().next().value as [string, unknown];
        pending.current.delete(qid);
        try {
          await saveFn({ data: { attemptId, questionId: qid, answer: value as never } });
        } catch {
          // Re-queue once; the loop's pacing resolves transient throttling.
          if (!pending.current.has(qid)) pending.current.set(qid, value);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    } finally {
      flushing.current = false;
    }
  }, [attemptId, saveFn]);
  const setAnswer = (qid: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    pending.current.set(qid, value);
    void flushQueue();
  };

  // ── Session token rotation ─────────────────────────────────────
  // Rotate the access token every 10 minutes during the exam so a token
  // captured mid-attempt has a short useful lifetime.
  useEffect(() => {
    if (!data || result) return;
    const t = setInterval(() => {
      void supabase.auth.refreshSession();
    }, 10 * 60_000);
    return () => clearInterval(t);
  }, [data, result]);

  // ── Submit ─────────────────────────────────────────────────────
  const submitFn = useServerFn(submitAttempt);
  const submitMut = useMutation({
    mutationFn: async () => {
      // Flush any queued answers, then rotate the token before the final write.
      await flushQueue();
      await supabase.auth.refreshSession().catch(() => null);
      return submitFn({ data: { attemptId } });
    },
    onSuccess: (res) => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if ("alreadyDone" in res) {
        navigate({ to: "/exams/$examId", params: { examId } });
        return;
      }
      setResult({ scorePct: res.scorePct, passed: res.passed, needsManual: res.needsManual });
      qc.invalidateQueries({ queryKey: ["exam-intro"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  submitRef.current = () => submitMut.mutate();

  // Auto-submit when timer reaches zero
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (
      !autoSubmittedRef.current &&
      remainingSec === 0 &&
      attempt?.status === "in_progress" &&
      !result
    ) {
      autoSubmittedRef.current = true;
      toast.info("Time's up — submitting");
      submitMut.mutate();
    }
  }, [remainingSec, attempt?.status, result, submitMut]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading exam…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Attempt not available.</p>;

  if (result) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        {result.passed ? (
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        ) : result.needsManual ? (
          <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        ) : (
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-semibold mb-2">
          {result.needsManual ? "Submitted for manual grading" : result.passed ? "Passed" : "Not passed"}
        </h2>
        <p className="text-muted-foreground mb-1">Auto-graded score: <span className="font-semibold text-foreground">{result.scorePct}%</span></p>
        {result.needsManual ? (
          <p className="text-sm text-muted-foreground mb-6">Essay questions still need to be reviewed. You will be notified when grading completes.</p>
        ) : null}
        <div className="flex justify-center gap-2">
          <Button
            onClick={() =>
              navigate({
                to: "/exams/$examId/result/$attemptId",
                params: { examId, attemptId },
              })
            }
          >
            View detailed results
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/exams/$examId", params: { examId } })}>Back to exam</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{exam?.title}</h2>
          <p className="text-xs text-muted-foreground">Pass {exam?.pass_score}% · {questions.length} questions</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={remainingSec != null && remainingSec < 60 ? "destructive" : "outline"} className="font-mono">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {fmt(remainingSec)}
          </Badge>
          <Button size="sm" variant="ghost" onClick={requestFullscreen}>Fullscreen</Button>
          <Button
            size="sm"
            onClick={() => {
              if (confirm("Submit your exam now?")) submitMut.mutate();
            }}
            disabled={submitMut.isPending}
          >
            <Send className="h-4 w-4 mr-1.5" />
            {submitMut.isPending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {questions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No approved questions in this exam yet. You may submit a blank attempt or contact the secretariat.
          </div>
        ) : (
          questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              index={i + 1}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-2 mb-3">
        <Badge variant="outline" className="font-mono">Q{index}</Badge>
        <Badge variant="secondary" className="text-[10px]">{question.points} pt</Badge>
        <Badge variant="outline" className="text-[10px] uppercase">{question.question_type}</Badge>
      </div>
      <p className="text-sm font-medium text-foreground mb-4 leading-relaxed select-none">
        {question.question_text}
      </p>

      {question.question_type === "essay" ? (
        <Textarea
          rows={6}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer…"
        />
      ) : question.question_type === "multi" ? (
        <div className="grid gap-2">
          {(question.options ?? []).map((opt, i) => {
            const arr = Array.isArray(value) ? (value as number[]) : [];
            const checked = arr.includes(i);
            return (
              <label
                key={i}
                className={
                  "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition " +
                  (checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40")
                }
              >
                <Input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((x) => x !== i) : [...arr, i];
                    onChange(next);
                  }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2">
          {(question.options ?? []).map((opt, i) => {
            const checked = value === i;
            return (
              <label
                key={i}
                className={
                  "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition " +
                  (checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40")
                }
              >
                <Input
                  type="radio"
                  name={`q-${question.id}`}
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => onChange(i)}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(sec: number | null): string {
  if (sec == null) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
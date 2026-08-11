import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Clock, Flag, Send, ShieldAlert, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChessViewer } from "@/components/learning/ChessViewer";
import {
  getAttemptClock,
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
  question_type: "mcq" | "multi" | "tf" | "essay" | "scenario" | "board";
  question_text: string;
  options: string[] | null;
  points: number;
  scenario_text?: string | null;
  image_url?: string | null;
  fen?: string | null;
  pgn?: string | null;
  board_instructions?: string | null;
  min_words?: number | null;
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
  const questions = (data?.questions ?? []) as unknown as Question[];
  const initialAnswers = (data?.answers ?? {}) as Record<string, unknown>;

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ scorePct: number; passed: boolean; needsManual: boolean } | null>(null);

  useEffect(() => {
    if (data) {
      setAnswers(initialAnswers);
      setFlags(new Set(data.flagged ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Anti-cheating ───────────────────────────────────────────────
  const violateFn = useServerFn(recordViolation);
  const autoSubmitRef = useRef(false);
  const submitRef = useRef<(() => void) | null>(null);
  const violateMut = useMutation({
    mutationFn: violateFn,
    onSuccess: (res) => {
      if (res.autoSubmit && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        toast.error("Too many integrity violations — your exam is being submitted.");
        submitRef.current?.();
      } else if (res.flagged) {
        toast.error(`${res.count} violations logged. This attempt is flagged for review.`);
      } else if (res.count >= 5) {
        toast.warning("Continued violations will result in your exam being flagged for review.");
      } else if (res.warn) {
        toast.warning("You have received a violation warning. Your exam may be flagged.");
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
    const onVis = () => { if (document.hidden) violate("tab_switch"); };
    const onBlur = () => violate("window_blur");
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); violate("copy"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); violate("paste"); };
    const onCtx = (e: MouseEvent) => { e.preventDefault(); violate("context_menu"); };
    const onFs = () => { if (!document.fullscreenElement) violate("exit_fullscreen"); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && k === "i") ||
        ((e.ctrlKey || e.metaKey) && ["c", "v", "p", "s", "a", "u"].includes(k))
      ) {
        e.preventDefault();
        violate("keyboard_shortcut", e.key);
      }
    };
    let devtoolsSeen = false;
    const devtoolsTimer = setInterval(() => {
      const open = window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160;
      if (open && !devtoolsSeen) { devtoolsSeen = true; violate("devtools_open"); }
      if (!open) devtoolsSeen = false;
    }, 2000);

    let lastActive = Date.now();
    const bump = () => { lastActive = Date.now(); };
    const idleTimer = setInterval(() => {
      if (Date.now() - lastActive > 120_000) {
        lastActive = Date.now();
        violate("idle_timeout");
      }
    }, 30_000);
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((ev) =>
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
      ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((ev) =>
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

  // ── Timer (server-synced every 60s) ────────────────────────────
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  useEffect(() => {
    if (!attempt || !exam) return;
    const ends = new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000;
    setRemainingSec(Math.max(0, Math.floor((ends - Date.now()) / 1000)));
  }, [attempt, exam]);
  useEffect(() => {
    const t = setInterval(() => setRemainingSec((s) => (s == null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(t);
  }, []);

  const clockFn = useServerFn(getAttemptClock);
  useEffect(() => {
    if (!data || result) return;
    const t = setInterval(() => {
      void clockFn({ data: { attemptId } })
        .then((res) => setRemainingSec(res.remainingSeconds))
        .catch(() => null);
    }, 60_000);
    return () => clearInterval(t);
  }, [data, result, attemptId, clockFn]);

  const chimedRef = useRef(false);
  useEffect(() => {
    if (remainingSec != null && remainingSec <= 300 && remainingSec > 0 && !chimedRef.current) {
      chimedRef.current = true;
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => { osc.stop(); void ctx.close(); }, 350);
      } catch { /* audio unavailable */ }
    }
  }, [remainingSec]);

  // ── Per-question time tracking ─────────────────────────────────
  const timeSpent = useRef<Record<string, number>>({});
  const enteredAt = useRef<number>(Date.now());
  const currentId = questions[current]?.id;
  useEffect(() => {
    enteredAt.current = Date.now();
  }, [currentId]);
  const commitTime = useCallback(() => {
    const id = questions[current]?.id;
    if (!id) return 0;
    const delta = Math.round((Date.now() - enteredAt.current) / 1000);
    timeSpent.current[id] = (timeSpent.current[id] ?? 0) + delta;
    enteredAt.current = Date.now();
    return timeSpent.current[id];
  }, [current, questions]);

  // ── Save answers (queued, ≥1.1s apart to respect the server throttle) ──
  const saveFn = useServerFn(saveAnswer);
  const pending = useRef<Map<string, { answer: unknown; flagged: boolean; time: number }>>(new Map());
  const flushing = useRef(false);
  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (pending.current.size > 0) {
        const [qid, value] = pending.current.entries().next().value as [string, { answer: unknown; flagged: boolean; time: number }];
        pending.current.delete(qid);
        try {
          await saveFn({
            data: {
              attemptId,
              questionId: qid,
              answer: value.answer as never,
              flagged: value.flagged,
              timeSpentSeconds: value.time,
            },
          });
        } catch {
          if (!pending.current.has(qid)) pending.current.set(qid, value);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    } finally {
      flushing.current = false;
    }
  }, [attemptId, saveFn]);

  const queue = (qid: string, answer: unknown, flagged: boolean) => {
    const t = timeSpent.current[qid] ?? 0;
    pending.current.set(qid, { answer, flagged, time: t });
    void flushQueue();
  };

  const setAnswer = (qid: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    commitTime();
    queue(qid, value, flags.has(qid));
  };

  const toggleFlag = (qid: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      queue(qid, answers[qid] ?? null, next.has(qid));
      return next;
    });
  };

  // ── Session token rotation ─────────────────────────────────────
  useEffect(() => {
    if (!data || result) return;
    const t = setInterval(() => { void supabase.auth.refreshSession(); }, 10 * 60_000);
    return () => clearInterval(t);
  }, [data, result]);

  // ── Submit ─────────────────────────────────────────────────────
  const submitFn = useServerFn(submitAttempt);
  const submitMut = useMutation({
    mutationFn: async () => {
      commitTime();
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

  const unanswered = useMemo(
    () => questions.filter((q) => answers[q.id] == null || answers[q.id] === "").length,
    [questions, answers],
  );

  const confirmSubmit = () => {
    const msg = unanswered > 0
      ? `Are you sure? You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}.`
      : "Submit your examination now?";
    if (confirm(msg)) submitMut.mutate();
  };

  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!autoSubmittedRef.current && remainingSec === 0 && attempt?.status === "in_progress" && !result) {
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
        <p className="text-muted-foreground mb-1">
          Auto-graded score: <span className="font-semibold text-foreground">{result.scorePct}%</span>
        </p>
        {result.needsManual ? (
          <p className="text-sm text-muted-foreground mb-6">
            Essay questions still need to be reviewed. You will be notified when grading completes.
          </p>
        ) : null}
        <div className="flex justify-center gap-2">
          <Button onClick={() => navigate({ to: "/exams/$examId/result/$attemptId", params: { examId, attemptId } })}>
            View detailed results
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/exams/$examId", params: { examId } })}>Back to exam</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const banner =
    remainingSec == null ? null
      : remainingSec <= 300 ? { tone: "bg-destructive/15 text-destructive border-destructive/40", text: "Less than 5 minutes remaining." }
      : remainingSec <= 600 ? { tone: "bg-orange-500/15 text-orange-500 border-orange-500/40", text: "10 minutes remaining." }
      : remainingSec <= 1800 ? { tone: "bg-amber-500/15 text-amber-500 border-amber-500/40", text: "30 minutes remaining." }
      : null;

  return (
    <div className="pb-12">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{exam?.title}</h2>
          <p className="text-xs text-muted-foreground">
            Q {questions.length ? current + 1 : 0}/{questions.length} · Pass {exam?.pass_score}% · Remaining: {unanswered}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={remainingSec != null && remainingSec <= 300 ? "destructive" : "outline"} className="font-mono">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {fmt(remainingSec)}
          </Badge>
          <Button size="sm" variant="ghost" onClick={requestFullscreen}>Fullscreen</Button>
          <Button size="sm" onClick={confirmSubmit} disabled={submitMut.isPending}>
            <Send className="h-4 w-4 mr-1.5" />
            {submitMut.isPending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {banner ? (
        <div className={`mt-4 rounded-lg border px-4 py-2 text-sm ${banner.tone}`}>{banner.text}</div>
      ) : null}

      {questions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          No approved questions in this exam yet. You may submit a blank attempt or contact the secretariat.
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-[1fr_260px] gap-6 items-start">
          <div>
            <QuestionCard
              index={current + 1}
              question={q!}
              value={answers[q!.id]}
              flagged={flags.has(q!.id)}
              onFlag={() => toggleFlag(q!.id)}
              onChange={(v) => setAnswer(q!.id, v)}
            />
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => { commitTime(); setCurrent((c) => Math.max(0, c - 1)); }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={current >= questions.length - 1}
                onClick={() => { commitTime(); setCurrent((c) => Math.min(questions.length - 1, c + 1)); }}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24">
            <h3 className="text-sm font-semibold mb-3">Question navigator</h3>
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {questions.map((item, i) => {
                const answered = answers[item.id] != null && answers[item.id] !== "";
                const isFlagged = flags.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => { commitTime(); setCurrent(i); }}
                    className={
                      "h-8 rounded text-xs font-medium border transition " +
                      (i === current
                        ? "ring-2 ring-primary border-primary "
                        : "") +
                      (isFlagged
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                        : answered
                          ? "bg-primary/15 border-primary/40 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mb-4">
              <li><span className="inline-block h-3 w-3 rounded-sm bg-primary/30 align-middle mr-1.5" /> Answered</li>
              <li><span className="inline-block h-3 w-3 rounded-sm border border-border align-middle mr-1.5" /> Not answered</li>
              <li><span className="inline-block h-3 w-3 rounded-sm bg-amber-500/40 align-middle mr-1.5" /> Flagged</li>
            </ul>
            <Button className="w-full" onClick={confirmSubmit} disabled={submitMut.isPending}>
              Submit Examination
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  value,
  flagged,
  onFlag,
  onChange,
}: {
  index: number;
  question: Question;
  value: unknown;
  flagged: boolean;
  onFlag: () => void;
  onChange: (v: unknown) => void;
}) {
  const words = typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const minWords = question.min_words ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">Q{index}</Badge>
          <Badge variant="secondary" className="text-[10px]">{question.points} pt</Badge>
          <Badge variant="outline" className="text-[10px] uppercase">{question.question_type}</Badge>
        </div>
        <Button size="sm" variant={flagged ? "default" : "ghost"} onClick={onFlag}>
          <Flag className="h-4 w-4 mr-1.5" /> {flagged ? "Flagged" : "Flag this question"}
        </Button>
      </div>

      {question.scenario_text ? (
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm mb-4 whitespace-pre-wrap select-none">
          {question.scenario_text}
        </div>
      ) : null}

      {question.image_url ? (
        <img src={question.image_url} alt="Question illustration" loading="lazy" className="rounded-lg border border-border mb-4 max-h-72 object-contain" />
      ) : null}

      {question.fen || question.pgn ? (
        <div className="mb-4">
          <ChessViewer pgn={question.pgn ?? ""} startFen={question.fen ?? null} />
          {question.board_instructions ? (
            <p className="text-xs text-muted-foreground mt-2">{question.board_instructions}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm font-medium text-foreground mb-4 leading-relaxed select-none whitespace-pre-wrap">
        {question.question_text}
      </p>

      {question.question_type === "essay" ? (
        <div>
          <Textarea
            rows={10}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your answer…"
          />
          <p className={"text-xs mt-1.5 " + (minWords && words < minWords ? "text-destructive" : "text-muted-foreground")}>
            {words} word{words === 1 ? "" : "s"}
            {minWords ? ` · minimum ${minWords}` : ""}
          </p>
        </div>
      ) : question.question_type === "multi" ? (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground mb-1">Select ALL correct answers.</p>
          {(question.options ?? []).map((opt, i) => {
            const arr = Array.isArray(value) ? (value as number[]) : [];
            const checked = arr.includes(i);
            return (
              <label
                key={i}
                className={
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition " +
                  (checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40")
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-current"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((x) => x !== i) : [...arr, i])}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      ) : question.question_type === "tf" ? (
        <div className="grid grid-cols-2 gap-3">
          {["TRUE", "FALSE"].map((label, i) => {
            const checked = value === i;
            return (
              <button
                key={label}
                onClick={() => onChange(i)}
                className={
                  "rounded-xl border py-6 text-base font-semibold transition " +
                  (checked ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40")
                }
              >
                {label}
              </button>
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
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition " +
                  (checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40")
                }
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="h-4 w-4 accent-current"
                  checked={checked}
                  onChange={() => onChange(i)}
                />
                <span className="text-sm">{String.fromCharCode(65 + i)}. {opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(sec: number | null): string {
  if (sec == null) return "--:--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

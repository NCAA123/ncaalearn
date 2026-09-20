import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Chess } from "chess.js";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveBoard } from "@/components/learning/InteractiveBoard";
import { ChessViewer } from "@/components/learning/ChessViewer";
import type { BoardExercise, ExerciseResult } from "@/lib/board-exercises";
import {
  gradeFindIllegalMove,
  gradeReconstructPosition,
  gradeRepetitionCount,
  gradeClockReading,
  submitReviewExercise,
} from "@/lib/board-exercise.functions";

// Renders the right UI per BoardExercise kind and grades it via the server
// functions in board-exercise.functions.ts. `mode` controls the practice/
// assessed split from the brief: practice shows immediate right/wrong
// feedback, assessed only shows a submitted confirmation until onDone.
export function BoardExerciseRunner({
  exercise,
  stepId,
  mode = "practice",
  onDone,
}: {
  exercise: BoardExercise;
  stepId: string;
  mode?: "practice" | "assessed";
  onDone: (result: ExerciseResult) => void;
}) {
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<ExerciseResult | null>(null);

  const findIllegalFn = useServerFn(gradeFindIllegalMove);
  const reconstructFn = useServerFn(gradeReconstructPosition);
  const repetitionFn = useServerFn(gradeRepetitionCount);
  const clockFn = useServerFn(gradeClockReading);
  const reviewFn = useServerFn(submitReviewExercise);

  const submit = useMutation({
    mutationFn: async (answer: unknown) => {
      switch (exercise.kind) {
        case "find_illegal_move":
          return findIllegalFn({ data: { stepId, illegalPly: answer as number, startedAt } });
        case "reconstruct_position":
          return reconstructFn({ data: { stepId, fen: answer as string, startedAt } });
        case "repetition_count":
          return repetitionFn({ data: { stepId, count: answer as number, startedAt } });
        case "clock_reading":
          return clockFn({ data: { stepId, seconds: answer as number, startedAt } });
        case "touch_sequence":
        case "board_decision":
          return reviewFn({ data: { stepId, optionId: answer as string, startedAt } });
      }
    },
    onSuccess: (res) => {
      setResult(res);
      if (mode === "assessed") onDone(res);
    },
  });

  if (result && mode === "practice") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div
          className={
            "flex items-center gap-2 text-sm font-medium " +
            (result.needsReview
              ? "text-muted-foreground"
              : result.correct
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive")
          }
        >
          {result.needsReview ? (
            <HelpCircle className="h-4 w-4" />
          ) : result.correct ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {result.needsReview ? "Submitted for review" : result.correct ? "Correct" : "Not quite"}
        </div>
        {result.detail && <p className="text-xs text-muted-foreground">{result.detail}</p>}
        <Button size="sm" onClick={() => onDone(result)}>
          Continue
        </Button>
      </div>
    );
  }

  switch (exercise.kind) {
    case "find_illegal_move":
      return (
        <FindIllegalMoveUI
          exercise={exercise}
          pending={submit.isPending}
          onSubmit={(ply) => submit.mutate(ply)}
        />
      );
    case "reconstruct_position":
      return (
        <ReconstructPositionUI
          exercise={exercise}
          pending={submit.isPending}
          onSubmit={(fen) => submit.mutate(fen)}
        />
      );
    case "repetition_count":
      return (
        <RepetitionCountUI
          exercise={exercise}
          pending={submit.isPending}
          onSubmit={(count) => submit.mutate(count)}
        />
      );
    case "clock_reading":
      return (
        <ClockReadingUI
          exercise={exercise}
          pending={submit.isPending}
          onSubmit={(seconds) => submit.mutate(seconds)}
        />
      );
    case "touch_sequence":
      return (
        <OptionsUI
          prompt={exercise.prompt}
          extra={exercise.timeline.map((t, i) => `${i + 1}. ${t.description}`)}
          options={exercise.options}
          pending={submit.isPending}
          onSubmit={(id) => submit.mutate(id)}
        />
      );
    case "board_decision":
      return (
        <BoardDecisionUI
          exercise={exercise}
          pending={submit.isPending}
          onSubmit={(id) => submit.mutate(id)}
        />
      );
  }
}

function FindIllegalMoveUI({
  exercise,
  pending,
  onSubmit,
}: {
  exercise: Extract<BoardExercise, { kind: "find_illegal_move" }>;
  pending: boolean;
  onSubmit: (ply: number) => void;
}) {
  const [ply, setPly] = useState<number | "">("");
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.prompt}</p>
      <ol className="text-sm font-mono grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 bg-muted/40 rounded-lg p-3">
        {exercise.moves.map((m, i) => (
          <li key={i}>
            {i + 1}. {m}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Illegal move number:</label>
        <Input
          type="number"
          min={1}
          className="w-24"
          value={ply}
          onChange={(e) => setPly(e.target.value ? Number(e.target.value) : "")}
        />
        <Button size="sm" disabled={ply === "" || pending} onClick={() => onSubmit(ply as number)}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function ReconstructPositionUI({
  exercise,
  pending,
  onSubmit,
}: {
  exercise: Extract<BoardExercise, { kind: "reconstruct_position" }>;
  pending: boolean;
  onSubmit: (fen: string) => void;
}) {
  const [fen, setFen] = useState<string>(() => new Chess().fen());
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.prompt}</p>
      <p className="text-xs text-muted-foreground">
        Reconstruct the position after ply {exercise.targetPly} using the board below -- no scoresheet replay shown.
      </p>
      <InteractiveBoard initialFen={fen} onMove={(_m, newFen) => setFen(newFen)} />
      <Button size="sm" disabled={pending} onClick={() => onSubmit(fen)}>
        Submit position
      </Button>
    </div>
  );
}

function RepetitionCountUI({
  exercise,
  pending,
  onSubmit,
}: {
  exercise: Extract<BoardExercise, { kind: "repetition_count" }>;
  pending: boolean;
  onSubmit: (count: number) => void;
}) {
  const [count, setCount] = useState<number | "">("");
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.prompt}</p>
      <ChessViewer pgn={exercise.pgn} />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Max repetitions of any one position:</label>
        <Input
          type="number"
          min={0}
          className="w-24"
          value={count}
          onChange={(e) => setCount(e.target.value ? Number(e.target.value) : "")}
        />
        <Button size="sm" disabled={count === "" || pending} onClick={() => onSubmit(count as number)}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function ClockReadingUI({
  exercise,
  pending,
  onSubmit,
}: {
  exercise: Extract<BoardExercise, { kind: "clock_reading" }>;
  pending: boolean;
  onSubmit: (seconds: number) => void;
}) {
  const [seconds, setSeconds] = useState<number | "">("");
  const tc = useMemo(() => {
    const parts = [`${exercise.baseSeconds}s base`];
    if (exercise.incrementSeconds) parts.push(`+${exercise.incrementSeconds}s increment`);
    if (exercise.delaySeconds) parts.push(`${exercise.delaySeconds}s delay`);
    return parts.join(", ");
  }, [exercise]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.prompt}</p>
      <p className="text-xs text-muted-foreground">Time control: {tc}</p>
      <p className="text-xs text-muted-foreground">
        Time spent per {exercise.askFor === "w" ? "White" : "Black"} move: {exercise.secondsSpentPerMove.join("s, ")}s
      </p>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">
          {exercise.askFor === "w" ? "White's" : "Black's"} remaining time (seconds):
        </label>
        <Input
          type="number"
          min={0}
          className="w-24"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value ? Number(e.target.value) : "")}
        />
        <Button size="sm" disabled={seconds === "" || pending} onClick={() => onSubmit(seconds as number)}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function OptionsUI({
  prompt,
  extra,
  options,
  pending,
  onSubmit,
}: {
  prompt: string;
  extra?: string[];
  options: { id: string; label: string }[];
  pending: boolean;
  onSubmit: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-medium text-foreground">{prompt}</p>
      {extra && (
        <ol className="text-xs text-muted-foreground space-y-0.5">
          {extra.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      )}
      <div className="grid gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={pending}
            onClick={() => onSubmit(o.id)}
            className="text-left text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted/40 transition"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BoardDecisionUI({
  exercise,
  pending,
  onSubmit,
}: {
  exercise: Extract<BoardExercise, { kind: "board_decision" }>;
  pending: boolean;
  onSubmit: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <InteractiveBoard initialFen={exercise.fen} disabled />
      <OptionsUI prompt={exercise.prompt} options={exercise.options} pending={pending} onSubmit={onSubmit} />
    </div>
  );
}

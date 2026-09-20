import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Chess } from "chess.js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClockState, tick, completeMove, type TimeControl } from "@/lib/chess-clock";
import type { BoardExercise, ExerciseResult, BoardExerciseKind } from "@/lib/board-exercises";

// Every grading handler here re-derives the correct answer from the
// exercise's own puzzle data (a scoresheet, a PGN, a time control) using
// chess.js / the chess-clock model -- never from a stored "answer" field,
// per the brief's "nothing solution-shaped reaches the client" rule. The
// client only ever sees what's returned by getScenarioForPlay (the puzzle
// data itself), and that data contains no answer fields to begin with.

async function loadExercise(stepId: string): Promise<BoardExercise> {
  const { data, error } = await supabaseAdmin
    .from("academy_scenario_steps")
    .select("context")
    .eq("id", stepId)
    .single();
  if (error) throw new Error(error.message);
  const exercise = (data.context as { board_exercise?: BoardExercise } | null)?.board_exercise;
  if (!exercise) throw new Error("This step has no board exercise attached");
  return exercise;
}

function baseResult(kind: BoardExerciseKind, startedAt: number): Omit<ExerciseResult, "correct" | "accuracy" | "detail"> {
  return { kind, attempts: 1, timeTakenMs: Date.now() - startedAt, needsReview: false };
}

// ── find_illegal_move ───────────────────────────────────────────────────
// Replays the scoresheet's raw SAN tokens one at a time; the first one
// chess.js rejects is the illegal ply (1-indexed). A scoresheet with no
// illegal move at all (misconfigured content) has no correct ply -- graded
// as incorrect against any answer, since that's an authoring bug, not a
// gradable puzzle.
export function findIllegalPly(moves: string[]): number | null {
  const g = new Chess();
  for (let i = 0; i < moves.length; i++) {
    try {
      g.move(moves[i]);
    } catch {
      return i + 1;
    }
  }
  return null;
}

export const gradeFindIllegalMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; illegalPly: number; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), illegalPly: z.number().int().min(1), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const exercise = await loadExercise(data.stepId);
    if (exercise.kind !== "find_illegal_move") throw new Error("Step is not a find_illegal_move exercise");
    const correctPly = findIllegalPly(exercise.moves);
    const correct = correctPly !== null && correctPly === data.illegalPly;
    const result: ExerciseResult = {
      ...baseResult("find_illegal_move", data.startedAt),
      correct,
      accuracy: correct ? 1 : 0,
      detail: correctPly !== null ? `Illegal move was ply ${correctPly}` : undefined,
    };
    return result;
  });

// ── reconstruct_position ────────────────────────────────────────────────
// Compares only the board+turn+castling+en-passant fields of the FEN (the
// first 4 space-separated fields), not halfmove/fullmove counters -- a
// candidate reconstructing from memory shouldn't be marked wrong over a
// counter they were never asked to track.
export function boardSignature(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

export const gradeReconstructPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; fen: string; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), fen: z.string().min(1).max(120), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const exercise = await loadExercise(data.stepId);
    if (exercise.kind !== "reconstruct_position") throw new Error("Step is not a reconstruct_position exercise");

    const g = new Chess();
    try {
      g.loadPgn(exercise.pgn, { strict: false } as never);
    } catch {
      throw new Error("This exercise's PGN failed to parse -- authoring bug");
    }
    const history = g.history({ verbose: true }) as Array<{ from: string; to: string; promotion?: string }>;
    const replay = new Chess();
    const plies = Math.min(exercise.targetPly, history.length);
    for (let i = 0; i < plies; i++) {
      replay.move({ from: history[i].from, to: history[i].to, promotion: history[i].promotion });
    }
    const expected = boardSignature(replay.fen());
    let candidateSignature: string | null = null;
    try {
      candidateSignature = boardSignature(new Chess(data.fen).fen());
    } catch {
      /* invalid fen from the candidate -- falls through as incorrect */
    }
    const correct = candidateSignature !== null && candidateSignature === expected;
    const result: ExerciseResult = {
      ...baseResult("reconstruct_position", data.startedAt),
      correct,
      accuracy: correct ? 1 : 0,
    };
    return result;
  });

// ── repetition_count ─────────────────────────────────────────────────────
// Counts how many times the single most-repeated position (board+turn+
// castling+en-passant signature) occurs across the whole game. This is a
// mechanical count only -- whether N repetitions makes a draw claim valid
// is a Laws-of-Chess question left to chief-arbiter-reviewed content.
export function maxRepetitionCount(pgn: string): number {
  const g = new Chess();
  try {
    g.loadPgn(pgn, { strict: false } as never);
  } catch {
    return 0;
  }
  const history = g.history({ verbose: true }) as Array<{ from: string; to: string; promotion?: string }>;
  const replay = new Chess();
  const counts = new Map<string, number>();
  counts.set(boardSignature(replay.fen()), 1);
  for (const move of history) {
    replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    const sig = boardSignature(replay.fen());
    counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

export const gradeRepetitionCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; count: number; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), count: z.number().int().min(0), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const exercise = await loadExercise(data.stepId);
    if (exercise.kind !== "repetition_count") throw new Error("Step is not a repetition_count exercise");
    const expected = maxRepetitionCount(exercise.pgn);
    const correct = expected === data.count;
    const result: ExerciseResult = {
      ...baseResult("repetition_count", data.startedAt),
      correct,
      accuracy: correct ? 1 : 0,
      detail: `Most-repeated position occurred ${expected} time(s)`,
    };
    return result;
  });

// ── clock_reading ────────────────────────────────────────────────────────
// Replays the given per-move thinking times through the same pure clock
// model used by ChessClock/useChessClock, so this exercise and the actual
// clock component can never disagree about the arithmetic.
export function computeClockReading(exercise: Extract<BoardExercise, { kind: "clock_reading" }>): number {
  const tc: TimeControl = {
    baseSeconds: exercise.baseSeconds,
    incrementSeconds: exercise.incrementSeconds,
    delaySeconds: exercise.delaySeconds,
  };
  let state = createClockState(tc);
  state = { ...state, running: true };
  const side = exercise.askFor;
  for (const seconds of exercise.secondsSpentPerMove) {
    // Only tick the side we're tracking when it's actually their turn --
    // the other side's moves are assumed instant for this word-problem
    // (their own thinking time doesn't affect the side being asked about).
    if (state.turn === side) {
      state = tick(state, seconds * 1000);
    }
    state = completeMove(state);
  }
  return Math.round((side === "w" ? state.whiteMs : state.blackMs) / 1000);
}

export const gradeClockReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; seconds: number; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), seconds: z.number().int().min(0), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const exercise = await loadExercise(data.stepId);
    if (exercise.kind !== "clock_reading") throw new Error("Step is not a clock_reading exercise");
    const expected = computeClockReading(exercise);
    // Allow a 1-second tolerance for rounding across many moves.
    const correct = Math.abs(expected - data.seconds) <= 1;
    const result: ExerciseResult = {
      ...baseResult("clock_reading", data.startedAt),
      correct,
      accuracy: correct ? 1 : 0,
      detail: `Expected reading: ${expected}s`,
    };
    return result;
  });

// ── touch_sequence / board_decision (draft, needs_review) ────────────────
// These two are explicitly NOT mechanically gradable per the brief -- they
// record the candidate's answer for a human (chief arbiter) to review,
// same as the existing scenario multiple-choice steps' "needs_review"
// content, rather than returning a correct/incorrect verdict.
export const submitReviewExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; optionId: string; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), optionId: z.string().min(1).max(80), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const exercise = await loadExercise(data.stepId);
    if (exercise.kind !== "touch_sequence" && exercise.kind !== "board_decision") {
      throw new Error("Step is not a review-graded exercise");
    }
    const result: ExerciseResult = {
      ...baseResult(exercise.kind, data.startedAt),
      correct: null,
      accuracy: 0,
      needsReview: true,
      detail: `Candidate selected: ${data.optionId}`,
    };
    return result;
  });

// Typed exercise formats stored inside the existing academy_scenario_steps
// .context jsonb column, under a `board_exercise` key (coexisting with the
// hall's own `fen`/`incidentType` keys -- no new tables, per the HD board
// sim brief). Every type here is the PUZZLE data only -- never a solution.
// The four mechanical kinds are graded by recomputing the correct answer
// from this same data on the server (src/lib/board-exercise.functions.ts);
// nothing solution-shaped is ever sent to the client.

export type BoardExerciseKind =
  | "find_illegal_move"
  | "reconstruct_position"
  | "repetition_count"
  | "clock_reading"
  | "touch_sequence"
  | "board_decision";

/** A scoresheet transcription with exactly one illegal move planted in it
 *  (a real training scenario: a candidate arbiter must catch a fraudulent
 *  or erroneous scoresheet entry). `moves` are raw SAN tokens in play
 *  order -- NOT loaded via chess.js's own loadPgn, since that throws on
 *  the illegal one. */
export type FindIllegalMoveExercise = {
  kind: "find_illegal_move";
  prompt: string;
  moves: string[];
};

/** The candidate reconstructs the position at `targetPly` (1-indexed, full
 *  plies from the start) from a scoresheet, without seeing a live board. */
export type ReconstructPositionExercise = {
  kind: "reconstruct_position";
  prompt: string;
  pgn: string;
  targetPly: number;
};

/** How many times did any single position repeat over the course of the
 *  game? (Whether that count makes a draw claim VALID under the current
 *  Laws of Chess is a ruling question for chief arbiters, not this
 *  exercise -- it only tests the mechanical counting.) */
export type RepetitionCountExercise = {
  kind: "repetition_count";
  prompt: string;
  pgn: string;
};

/** A word-problem: given a time control and how long each side spent per
 *  move, what does one side's clock read after N moves? */
export type ClockReadingExercise = {
  kind: "clock_reading";
  prompt: string;
  baseSeconds: number;
  incrementSeconds?: number;
  delaySeconds?: number;
  /** Seconds spent thinking on each of that side's moves, in order. */
  secondsSpentPerMove: number[];
  /** "w"/"b" to match the shared Side type in chess-clock.ts. */
  askFor: "w" | "b";
};

/** Draft/needs_review per the brief -- not mechanically gradable. The
 *  candidate watches a described sequence of piece touches and identifies
 *  which piece was touched first (relevant to the touched-piece rule). */
export type TouchSequenceExercise = {
  kind: "touch_sequence";
  prompt: string;
  timeline: { description: string }[];
  options: { id: string; label: string }[];
  /** Present only so an instructor authoring this can see their own draft
   *  intent -- NEVER sent to the client at play time. Real grading is a
   *  human review until a chief arbiter formalizes the rule. */
  draftAnswerId?: string;
};

/** Draft/needs_review per the brief -- an arbiter-judgment ruling question
 *  from a position + clock snapshot, same shape as the existing scenario
 *  step multiple-choice format. */
export type BoardDecisionExercise = {
  kind: "board_decision";
  prompt: string;
  fen: string;
  whiteSeconds?: number;
  blackSeconds?: number;
  options: { id: string; label: string }[];
  draftAnswerId?: string;
};

export type BoardExercise =
  | FindIllegalMoveExercise
  | ReconstructPositionExercise
  | RepetitionCountExercise
  | ClockReadingExercise
  | TouchSequenceExercise
  | BoardDecisionExercise;

/** What every grading path returns, whether auto-graded or queued for
 *  human review -- this is the shape certification/CPD wiring (a later
 *  task) will consume. */
export type ExerciseResult = {
  kind: BoardExerciseKind;
  /** null when the exercise needs human review rather than auto-grading. */
  correct: boolean | null;
  /** 0-1. For auto-graded kinds this is 1 or 0; reserved for partial
   *  credit on more granular kinds later. */
  accuracy: number;
  attempts: number;
  timeTakenMs: number;
  detail?: string;
  needsReview: boolean;
};

// Strips whatever a client-authored candidate answer field is for a given
// kind, purely for type-checking call sites -- never persisted as-is.
export type ExerciseAnswer =
  | { kind: "find_illegal_move"; illegalPly: number }
  | { kind: "reconstruct_position"; fen: string }
  | { kind: "repetition_count"; count: number }
  | { kind: "clock_reading"; seconds: number }
  | { kind: "touch_sequence"; optionId: string }
  | { kind: "board_decision"; optionId: string };

// Pure, framework-agnostic chess clock model -- no React, no rendering, no
// Laws-of-Chess rulings (it only counts time; whether a flag fall is even
// claimable, or whether an arbiter should intervene, is a ruling question
// for the exercise/incident layer built on top of this, never this file).
// Kept separate from ChessClock.tsx per the HD board sim brief so the hall
// and future exercises can drive a clock without any React dependency.

export type Side = "w" | "b";

export type TimeControl = {
  baseSeconds: number;
  /** Fischer increment, added to the mover's clock after they complete a move. */
  incrementSeconds?: number;
  /** Simple/US delay: this many seconds count down before the base time
   *  starts ticking on each of the mover's turns; unused delay is not
   *  banked (Bronstein-style banking is a different, more complex variant
   *  not implemented here). */
  delaySeconds?: number;
};

export type ClockState = {
  whiteMs: number;
  blackMs: number;
  /** Whose clock is currently ticking (or would tick if running). */
  turn: Side;
  running: boolean;
  /** Set once a side's clock reaches zero; ticking stops permanently. */
  flagged: Side | null;
  /** Remaining delay window for the side to move, in ms (0 once elapsed). */
  delayRemainingMs: number;
  timeControl: TimeControl;
};

export function createClockState(timeControl: TimeControl): ClockState {
  const baseMs = Math.round(timeControl.baseSeconds * 1000);
  return {
    whiteMs: baseMs,
    blackMs: baseMs,
    turn: "w",
    running: false,
    flagged: null,
    delayRemainingMs: Math.round((timeControl.delaySeconds ?? 0) * 1000),
    timeControl,
  };
}

export function start(state: ClockState): ClockState {
  if (state.flagged) return state;
  return { ...state, running: true };
}

export function pause(state: ClockState): ClockState {
  return { ...state, running: false };
}

export function reset(state: ClockState, timeControl: TimeControl = state.timeControl): ClockState {
  return createClockState(timeControl);
}

/** Advances the running side's clock by `deltaMs` of real elapsed time. */
export function tick(state: ClockState, deltaMs: number): ClockState {
  if (!state.running || state.flagged || deltaMs <= 0) return state;

  let delayRemaining = state.delayRemainingMs;
  let spend = deltaMs;
  if (delayRemaining > 0) {
    const consumed = Math.min(delayRemaining, spend);
    delayRemaining -= consumed;
    spend -= consumed;
  }
  if (spend <= 0) {
    return { ...state, delayRemainingMs: delayRemaining };
  }

  const key = state.turn === "w" ? "whiteMs" : "blackMs";
  const remaining = Math.max(0, state[key] - spend);
  const flagged = remaining === 0 ? state.turn : null;

  return {
    ...state,
    [key]: remaining,
    delayRemainingMs: delayRemaining,
    flagged,
    running: flagged ? false : state.running,
  };
}

/** Call when the side to move completes a move: applies increment, switches
 *  the turn, and resets the delay window for whoever moves next. */
export function completeMove(state: ClockState): ClockState {
  if (state.flagged) return state;
  const incrementMs = Math.round((state.timeControl.incrementSeconds ?? 0) * 1000);
  const key = state.turn === "w" ? "whiteMs" : "blackMs";
  const nextTurn: Side = state.turn === "w" ? "b" : "w";
  return {
    ...state,
    [key]: state[key] + incrementMs,
    turn: nextTurn,
    delayRemainingMs: Math.round((state.timeControl.delaySeconds ?? 0) * 1000),
  };
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  // Show tenths under 20 seconds, matching how physical/digital chess
  // clocks switch to finer granularity near a flag fall. Uses floor
  // throughout (not the ceil-to-whole-second rounding below) so the
  // seconds digit and the tenths digit always agree with each other.
  if (clamped < 20_000 && clamped > 0) {
    const totalTenths = Math.floor(clamped / 100);
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor(totalTenths / 10) % 60;
    const tenths = totalTenths % 10;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  // Round up to the nearest whole second so a clock with time still on it
  // never momentarily displays 0:00.
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

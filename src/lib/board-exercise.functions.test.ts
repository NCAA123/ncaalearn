import { describe, expect, it } from "vitest";
import { findIllegalPly, boardSignature, maxRepetitionCount, computeClockReading } from "./board-exercise.functions";
import type { ClockReadingExercise } from "./board-exercises";

describe("findIllegalPly", () => {
  it("returns null for a fully legal game", () => {
    expect(findIllegalPly(["e4", "e5", "Nf3", "Nc6"])).toBeNull();
  });

  it("finds the illegal move planted at the start", () => {
    expect(findIllegalPly(["e5", "e5"])).toBe(1);
  });

  it("finds an illegal move planted mid-game", () => {
    // Nf3 cannot reach f7 in one hop -- not a legal knight move from there.
    expect(findIllegalPly(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "Nxf7", "Ke7", "Nxf6"])).toBe(7);
  });

  it("finds an illegal move that is a real SAN string but impossible in context", () => {
    // Two knights can't both legally reach the same illegal claim; use a
    // pawn move that jumps a piece.
    expect(findIllegalPly(["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "e5", "dxe5", "Nc6", "d5"])).toBe(11);
  });
});

describe("boardSignature", () => {
  it("keeps only board/turn/castling/en-passant, dropping the move counters", () => {
    const a = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const b = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 99 40";
    expect(boardSignature(a)).toBe(boardSignature(b));
  });

  it("differs when the actual position differs", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    expect(boardSignature(start)).not.toBe(boardSignature(afterE4));
  });
});

describe("maxRepetitionCount", () => {
  it("returns 1 for a game with no repeated positions", () => {
    expect(maxRepetitionCount("1. e4 e5 2. Nf3 Nc6")).toBe(1);
  });

  it("counts a threefold-repetition-by-shuffling game correctly", () => {
    // Two full knight-shuffle round trips recreate the start position's
    // signature at ply 4 and ply 8, for 3 total occurrences (start + 2).
    const pgn = "1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8";
    expect(maxRepetitionCount(pgn)).toBe(3);
  });

  it("returns 0 for an unparseable pgn (authoring bug, not a candidate error)", () => {
    expect(maxRepetitionCount("not a real pgn at all")).toBe(0);
  });
});

describe("computeClockReading", () => {
  const base: ClockReadingExercise = {
    kind: "clock_reading",
    prompt: "test",
    baseSeconds: 300,
    askFor: "w",
    secondsSpentPerMove: [],
  };

  it("returns the base time when no time has been spent", () => {
    expect(computeClockReading({ ...base, secondsSpentPerMove: [] })).toBe(300);
  });

  it("subtracts real thinking time only on the tracked side's own moves", () => {
    // white move 1 (10s), black move 1 (30s -- ignored for white's clock),
    // white move 2 (15s)
    const result = computeClockReading({ ...base, secondsSpentPerMove: [10, 30, 15] });
    expect(result).toBe(300 - 10 - 15);
  });

  it("applies increment after each of the tracked side's own moves", () => {
    const result = computeClockReading({
      ...base,
      incrementSeconds: 5,
      secondsSpentPerMove: [10, 30], // one white move, one black move
    });
    expect(result).toBe(300 - 10 + 5);
  });

  it("tracks black correctly when asked", () => {
    const result = computeClockReading({
      ...base,
      askFor: "b",
      secondsSpentPerMove: [10, 20], // white's move ignored, black spent 20s
    });
    expect(result).toBe(300 - 20);
  });
});

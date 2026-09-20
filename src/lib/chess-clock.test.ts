import { describe, expect, it } from "vitest";
import { completeMove, createClockState, pause, start, tick, formatClock, type TimeControl } from "./chess-clock";

const FIVE_MIN: TimeControl = { baseSeconds: 300 };

describe("createClockState", () => {
  it("starts both sides at the base time, white to move, not running", () => {
    const s = createClockState(FIVE_MIN);
    expect(s.whiteMs).toBe(300_000);
    expect(s.blackMs).toBe(300_000);
    expect(s.turn).toBe("w");
    expect(s.running).toBe(false);
    expect(s.flagged).toBeNull();
  });
});

describe("tick", () => {
  it("does nothing while paused", () => {
    const s = createClockState(FIVE_MIN);
    const after = tick(s, 5000);
    expect(after).toBe(s);
  });

  it("counts down the side to move while running", () => {
    const s = start(createClockState(FIVE_MIN));
    const after = tick(s, 1500);
    expect(after.whiteMs).toBe(298_500);
    expect(after.blackMs).toBe(300_000);
  });

  it("never goes below zero and sets flagged at exactly zero", () => {
    const s = start(createClockState({ baseSeconds: 1 }));
    const after = tick(s, 5000);
    expect(after.whiteMs).toBe(0);
    expect(after.flagged).toBe("w");
    expect(after.running).toBe(false);
  });

  it("stops ticking once flagged, even if told to run again", () => {
    let s = start(createClockState({ baseSeconds: 1 }));
    s = tick(s, 2000);
    expect(s.flagged).toBe("w");
    s = start(s);
    expect(s.running).toBe(false);
    const after = tick(s, 1000);
    expect(after).toBe(s);
  });
});

describe("completeMove", () => {
  it("switches the turn", () => {
    const s = createClockState(FIVE_MIN);
    const after = completeMove(s);
    expect(after.turn).toBe("b");
  });

  it("applies Fischer increment to the mover, not the opponent", () => {
    const s = createClockState({ baseSeconds: 300, incrementSeconds: 5 });
    const after = completeMove(s); // white just moved
    expect(after.whiteMs).toBe(305_000);
    expect(after.blackMs).toBe(300_000);
  });

  it("does nothing once a side has flagged", () => {
    let s = start(createClockState({ baseSeconds: 1 }));
    s = tick(s, 2000);
    const after = completeMove(s);
    expect(after.turn).toBe(s.turn);
  });
});

describe("delay", () => {
  const DELAY_TC: TimeControl = { baseSeconds: 60, delaySeconds: 5 };

  it("burns the delay window before touching base time", () => {
    let s = start(createClockState(DELAY_TC));
    s = tick(s, 3000);
    expect(s.delayRemainingMs).toBe(2000);
    expect(s.whiteMs).toBe(60_000);
  });

  it("starts consuming base time once the delay window is exhausted", () => {
    let s = start(createClockState(DELAY_TC));
    s = tick(s, 5000); // exactly exhausts the 5s delay
    expect(s.delayRemainingMs).toBe(0);
    expect(s.whiteMs).toBe(60_000);
    s = tick(s, 1000); // now base time ticks
    expect(s.whiteMs).toBe(59_000);
  });

  it("splits a single tick across the delay boundary correctly", () => {
    let s = start(createClockState(DELAY_TC));
    s = tick(s, 7000); // 5s delay + 2s base time in one tick
    expect(s.delayRemainingMs).toBe(0);
    expect(s.whiteMs).toBe(58_000);
  });

  it("resets the delay window for the next side on completeMove", () => {
    let s = start(createClockState(DELAY_TC));
    s = tick(s, 5000); // exhaust white's delay
    s = completeMove(s); // black to move now
    expect(s.turn).toBe("b");
    expect(s.delayRemainingMs).toBe(5000);
  });
});

describe("pause", () => {
  it("freezes both clocks", () => {
    let s = start(createClockState(FIVE_MIN));
    s = tick(s, 1000);
    s = pause(s);
    const before = { ...s };
    s = tick(s, 5000);
    expect(s.whiteMs).toBe(before.whiteMs);
  });
});

describe("formatClock", () => {
  it("formats minutes:seconds", () => {
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(0)).toBe("0:00");
  });

  it("shows tenths under 20 seconds", () => {
    expect(formatClock(15_400)).toBe("0:15.4");
  });

  it("formats hours when over 60 minutes", () => {
    expect(formatClock(3_661_000)).toBe("1:01:01");
  });
});

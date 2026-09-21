import { describe, expect, it } from "vitest";
import { generateTimeline, getActiveIncidents, isAlerted, scorePrioritization, type TimelineIncidentDef } from "./incident-timeline";

const DEFS: TimelineIncidentDef[] = [
  { id: "a", category: "touch_move_dispute" },
  { id: "b", category: "clock_dispute" },
  { id: "c", category: "conduct_disturbance" },
];

describe("generateTimeline", () => {
  it("is deterministic -- same seed always produces the same schedule", () => {
    const t1 = generateTimeline(42, DEFS);
    const t2 = generateTimeline(42, DEFS);
    expect(t1).toEqual(t2);
  });

  it("produces a different schedule for a different seed", () => {
    const t1 = generateTimeline(1, DEFS);
    const t2 = generateTimeline(2, DEFS);
    expect(t1.map((e) => e.triggerAtMs)).not.toEqual(t2.map((e) => e.triggerAtMs));
  });

  it("keeps every trigger time inside [0, windowMs)", () => {
    const windowMs = 5000;
    const events = generateTimeline(7, DEFS, { windowMs });
    for (const e of events) {
      expect(e.triggerAtMs).toBeGreaterThanOrEqual(0);
      expect(e.triggerAtMs).toBeLessThan(windowMs);
    }
  });

  it("sets alertAtMs to triggerAtMs + alertDelayMs", () => {
    const events = generateTimeline(3, DEFS, { alertDelayMs: 30_000 });
    for (const e of events) {
      expect(e.alertAtMs).toBe(e.triggerAtMs + 30_000);
    }
  });

  it("returns one event per incident, sorted by trigger time", () => {
    const events = generateTimeline(9, DEFS);
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.incidentId).sort()).toEqual(["a", "b", "c"]);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].triggerAtMs).toBeGreaterThanOrEqual(events[i - 1].triggerAtMs);
    }
  });
});

describe("getActiveIncidents / isAlerted", () => {
  const events = [
    { incidentId: "a", category: "touch_move_dispute" as const, triggerAtMs: 0, alertAtMs: 1000 },
    { incidentId: "b", category: "clock_dispute" as const, triggerAtMs: 2000, alertAtMs: 3000 },
  ];

  it("an incident is inactive before its trigger time", () => {
    expect(getActiveIncidents(events, 500, new Set())).toEqual([events[0]]);
  });

  it("both incidents are active once both have triggered", () => {
    expect(getActiveIncidents(events, 2500, new Set())).toEqual(events);
  });

  it("a resolved incident drops out even after triggering", () => {
    expect(getActiveIncidents(events, 2500, new Set(["a"]))).toEqual([events[1]]);
  });

  it("isAlerted flips exactly at alertAtMs", () => {
    expect(isAlerted(events[0], 999)).toBe(false);
    expect(isAlerted(events[0], 1000)).toBe(true);
  });
});

describe("scorePrioritization", () => {
  const events = [
    { incidentId: "a", category: "touch_move_dispute" as const, triggerAtMs: 0, alertAtMs: 1000 },
    { incidentId: "b", category: "clock_dispute" as const, triggerAtMs: 500, alertAtMs: 1500 },
  ];

  it("returns null when no response ever had another incident active alongside it", () => {
    // a resolved before b ever triggers
    const score = scorePrioritization(events, [{ incidentId: "a", respondedAtMs: 100 }]);
    expect(score).toBeNull();
  });

  it("scores 1 when the longer-waiting incident is always handled first", () => {
    const score = scorePrioritization(events, [
      { incidentId: "a", respondedAtMs: 600 }, // both active (a since 0, b since 500) -- a is more overdue, correctly handled first
      { incidentId: "b", respondedAtMs: 700 }, // only b left
    ]);
    expect(score).toBe(1);
  });

  it("scores 0 when the more overdue incident is skipped in favor of the newer one", () => {
    const score = scorePrioritization(events, [
      { incidentId: "b", respondedAtMs: 600 }, // both active, a is more overdue but b was handled
      { incidentId: "a", respondedAtMs: 700 },
    ]);
    expect(score).toBe(0);
  });
});

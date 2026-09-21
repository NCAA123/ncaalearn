import { describe, expect, it } from "vitest";
import { buildSimulationResult, type IncidentAttemptRecord } from "./incidents";

function record(overrides: Partial<IncidentAttemptRecord> = {}): IncidentAttemptRecord {
  return {
    incidentId: "step-1",
    category: "touch_move_dispute",
    respondedOptionId: "opt-1",
    presentedAtMs: 1000,
    respondedAtMs: 5000,
    noticedUnprompted: null,
    ...overrides,
  };
}

describe("buildSimulationResult", () => {
  it("carries scenario id, mode, and the raw records through unchanged", () => {
    const records = [record()];
    const result = buildSimulationResult("scenario-1", "practice", "2026-01-01T00:00:00.000Z", records);
    expect(result.scenarioId).toBe("scenario-1");
    expect(result.mode).toBe("practice");
    expect(result.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.incidentsHandled).toEqual(records);
  });

  it("never invents an accuracy score -- no verified rulings exist to grade against", () => {
    const result = buildSimulationResult("scenario-1", "assessed", "2026-01-01T00:00:00.000Z", [record()]);
    expect(result.decisionAccuracy).toBeNull();
    expect(result.ruleAccuracy).toBeNull();
    expect(result.prioritizationScore).toBeNull();
  });

  it("averages response time across all handled incidents", () => {
    const records = [
      record({ presentedAtMs: 0, respondedAtMs: 4000 }), // 4000ms
      record({ presentedAtMs: 0, respondedAtMs: 8000 }), // 8000ms
    ];
    const result = buildSimulationResult("s", "practice", "2026-01-01T00:00:00.000Z", records);
    expect(result.averageResponseTimeMs).toBe(6000);
  });

  it("returns null response time and observation score for an empty session", () => {
    const result = buildSimulationResult("s", "practice", "2026-01-01T00:00:00.000Z", []);
    expect(result.averageResponseTimeMs).toBeNull();
    expect(result.observationScore).toBeNull();
  });

  it("computes observation score only from records with a known noticedUnprompted flag", () => {
    const records = [
      record({ noticedUnprompted: true }),
      record({ noticedUnprompted: false }),
      record({ noticedUnprompted: null }), // excluded -- unknown, not "not noticed"
    ];
    const result = buildSimulationResult("s", "practice", "2026-01-01T00:00:00.000Z", records);
    expect(result.observationScore).toBe(0.5);
  });

  it("leaves observation score null when no record has a known flag", () => {
    const records = [record({ noticedUnprompted: null }), record({ noticedUnprompted: null })];
    const result = buildSimulationResult("s", "practice", "2026-01-01T00:00:00.000Z", records);
    expect(result.observationScore).toBeNull();
  });
});

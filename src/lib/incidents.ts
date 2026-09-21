// Phase 5's incident engine content types. An "incident" is a scripted
// dispute/disturbance a candidate arbiter must respond to at a hall
// station -- distinct from a board_exercise (a mechanically gradable chess
// puzzle) in that every incident is a judgment call. Per this repo's
// standing content-safety rule (see board-exercises.ts's touch_sequence/
// board_decision kinds), no option here is ever presented as an
// authoritative FIDE ruling: every response is recorded for chief-arbiter
// review, never auto-graded correct/incorrect.

export type IncidentCategory =
  | "touch_move_dispute"
  | "clock_dispute"
  | "conduct_disturbance"
  | "scoresheet_discrepancy"
  | "spectator_interference"
  | "electronic_device";

export type IncidentOption = {
  id: string;
  label: string;
};

export type Incident = {
  category: IncidentCategory;
  title: string;
  // What the arbiter is told/observes on arrival -- deliberately narrative,
  // not a rules citation.
  narrative: string;
  // Optional situational context: the position and clock readout at the
  // moment of the incident, if relevant to the judgment call.
  fen?: string;
  whiteSeconds?: number;
  blackSeconds?: number;
  options: IncidentOption[];
  // Candidate-facing reference points for the response options, each
  // explicitly marked as a draft pending chief-arbiter verification --
  // never invented as settled fact.
  articleRefs?: string[];
};

export type IncidentResult = {
  needsReview: true;
  submittedOptionId: string;
  timeTakenMs: number;
};

// Phase 5's two run modes, as a flag only (both currently behave the same
// mechanically -- assessed mode's job is purely to withhold feedback, see
// IncidentPanel.tsx). A per-run choice, not per-incident.
export type IncidentMode = "practice" | "assessed";

// One completed incident interaction, timestamped so a session's worth of
// these can be aggregated into a SimulationResult. Built by whatever calls
// IncidentPanel with an onRecorded callback (see /dev/hall, /dev/incident).
export type IncidentAttemptRecord = {
  incidentId: string; // the step id the incident came from
  category: IncidentCategory;
  respondedOptionId: string;
  presentedAtMs: number; // when the panel first opened (Date.now())
  respondedAtMs: number; // when the response was submitted
  // True if the candidate opened this incident's panel without having just
  // been routed there by a forced "next station" flow -- i.e. they noticed
  // and walked up on their own. Only meaningful once a real timeline/
  // trigger system exists (Phase 5's "overlapping incidents" runner isn't
  // built yet); until then this is always null, not a guessed value.
  noticedUnprompted: boolean | null;
};

// The brief's own explicit requirement: "produces a clean, structured
// result object that can be wired in later" -- certificates/CPD wiring is
// out of scope for this pass, so this type is the deliverable itself, not
// a stub. decisionAccuracy/ruleAccuracy stay null rather than a guessed
// number: per this repo's no-invented-rulings rule, there is no verified
// correct answer to score an incident response against yet (every
// Incident.options list is a draft pending chief-arbiter review) -- filling
// these in requires real verified rulings to exist first, which is
// explicitly later work, not something to fake here.
export type SimulationResult = {
  scenarioId: string;
  mode: IncidentMode;
  startedAt: string; // ISO timestamp
  completedAt: string; // ISO timestamp
  incidentsHandled: IncidentAttemptRecord[];
  decisionAccuracy: number | null;
  ruleAccuracy: number | null;
  averageResponseTimeMs: number | null;
  observationScore: number | null; // fraction noticed unprompted, once meaningful
  prioritizationScore: number | null; // requires overlapping-incident timeline, not built yet
};

// Pure aggregation -- no side effects, so it's trivially unit-testable and
// reusable from any caller (a dev QA page today; a real timed session
// later) without depending on how the records were collected.
export function buildSimulationResult(
  scenarioId: string,
  mode: IncidentMode,
  startedAt: string,
  records: IncidentAttemptRecord[],
): SimulationResult {
  const responseTimes = records.map((r) => r.respondedAtMs - r.presentedAtMs);
  const averageResponseTimeMs =
    responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

  const noticedFlags = records.map((r) => r.noticedUnprompted).filter((v): v is boolean => v !== null);
  const observationScore = noticedFlags.length > 0 ? noticedFlags.filter(Boolean).length / noticedFlags.length : null;

  return {
    scenarioId,
    mode,
    startedAt,
    completedAt: new Date().toISOString(),
    incidentsHandled: records,
    decisionAccuracy: null,
    ruleAccuracy: null,
    averageResponseTimeMs,
    observationScore,
    prioritizationScore: null,
  };
}

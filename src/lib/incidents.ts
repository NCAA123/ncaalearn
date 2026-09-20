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

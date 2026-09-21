// Phase 5's own explicit spec: "A timeline runner that starts incidents at
// set times, can overlap them, and accepts a random seed so assessed runs
// can vary while staying reproducible." Everything here is pure and
// deterministic given the same seed -- no Date.now()/Math.random() calls
// inside the generator itself, so a real timed run and a unit test see
// exactly the same schedule.
import type { IncidentCategory } from "./incidents";

export type TimelineIncidentDef = {
  id: string; // a real academy_scenario_steps id, or any stable content key
  category: IncidentCategory;
};

export type TimelineEvent = {
  incidentId: string;
  category: IncidentCategory;
  triggerAtMs: number; // when the incident starts (silently) -- the candidate can notice it any time from here
  alertAtMs: number; // when it escalates to an obvious cue if still unhandled
};

// mulberry32 -- a small, fast, seedable PRNG. Not cryptographic (doesn't
// need to be); just deterministic so the same seed always produces the
// same schedule, per the brief's own requirement.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Spreads `incidents` across [0, windowMs), each getting an alert
// `alertDelayMs` after it triggers if still unhandled by then. Deliberately
// allows (does not prevent) overlap -- two incidents can have triggerAtMs
// within alertDelayMs of each other, which is the whole point of a
// "small live round" with simultaneous disputes. The incident order in
// the input array does not determine trigger order; the seed does.
export function generateTimeline(
  seed: number,
  incidents: TimelineIncidentDef[],
  options: { windowMs?: number; alertDelayMs?: number } = {},
): TimelineEvent[] {
  const windowMs = options.windowMs ?? 10 * 60 * 1000; // 10-minute round, per the brief's Phase 5 acceptance example
  const alertDelayMs = options.alertDelayMs ?? 60 * 1000;
  const rand = mulberry32(seed);

  return incidents
    .map((def) => ({
      incidentId: def.id,
      category: def.category,
      triggerAtMs: Math.floor(rand() * windowMs),
      alertAtMs: 0, // filled in below
    }))
    .map((event) => ({ ...event, alertAtMs: event.triggerAtMs + alertDelayMs }))
    .sort((a, b) => a.triggerAtMs - b.triggerAtMs);
}

// An incident is "live" once triggered and until the caller marks it
// resolved (via the `resolvedIds` set it tracks itself -- this module has
// no mutable state of its own, staying a pure function of elapsed time).
export function getActiveIncidents(events: TimelineEvent[], elapsedMs: number, resolvedIds: ReadonlySet<string>): TimelineEvent[] {
  return events.filter((e) => e.triggerAtMs <= elapsedMs && !resolvedIds.has(e.incidentId));
}

export function isAlerted(event: TimelineEvent, elapsedMs: number): boolean {
  return elapsedMs >= event.alertAtMs;
}

// Phase 5's "prioritisation" metric: among the incidents active at the
// moment each response was made, was the most time-critical one (earliest
// triggerAtMs, i.e. longest-waiting) the one actually handled? Scored as
// the fraction of responses that were the most-overdue active incident at
// their own response time. Only meaningful when at least one response had
// another incident active alongside it -- responses made alone (nothing
// else was active) don't count toward either the numerator or denominator,
// since there was no prioritisation choice to make.
export function scorePrioritization(
  events: TimelineEvent[],
  responses: { incidentId: string; respondedAtMs: number }[],
): number | null {
  // Replays resolution in the order responses actually happened, so each
  // response's "what else was active right now" reflects the real session.
  const resolved = new Set<string>();
  let consideredCount = 0;
  let correctCount = 0;

  for (const response of responses) {
    const activeAtResponse = getActiveIncidents(events, response.respondedAtMs, resolved);
    if (activeAtResponse.length > 1) {
      consideredCount += 1;
      const mostOverdue = activeAtResponse.reduce((a, b) => (a.triggerAtMs <= b.triggerAtMs ? a : b));
      if (mostOverdue.incidentId === response.incidentId) correctCount += 1;
    }
    resolved.add(response.incidentId);
  }

  return consideredCount > 0 ? correctCount / consideredCount : null;
}

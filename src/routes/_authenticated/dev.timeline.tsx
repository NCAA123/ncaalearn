import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IncidentPanel } from "@/components/simulation/IncidentPanel";
import { generateTimeline, getActiveIncidents, isAlerted, type TimelineEvent } from "@/lib/incident-timeline";
import { buildSimulationResult, type Incident, type IncidentAttemptRecord, type IncidentMode } from "@/lib/incidents";

export const Route = createFileRoute("/_authenticated/dev/timeline")({
  head: () => ({ meta: [{ title: "Timeline QA — NCAA Academy" }] }),
  component: DevTimelinePage,
});

// Real seeded steps from the "Hall Incidents — Small Live Round Review
// Set" scenario (see NOTES.md) -- genuine content, genuine step ids, so
// submitIncidentResponse's round trip actually succeeds here rather than
// hitting the fake-id error path /dev/incident deliberately demos.
const INCIDENTS: Record<string, Incident> = {
  "1af5c23f-dc8e-4229-957b-cb9eb8417811": {
    category: "clock_dispute",
    title: "A player claims their opponent pressed the clock with the wrong hand deliberately to gain time",
    narrative:
      "Black accuses White of reaching across the board to press the clock rather than using the hand nearer to it, claiming this shaved time off Black's thinking. White says it was an unconscious habit, not deliberate.",
    whiteSeconds: 3600,
    blackSeconds: 3550,
    options: [
      { id: "warn-technique", label: "Warn White about correct clock-pressing technique, no time adjustment" },
      { id: "credit-time", label: "Credit Black a small amount of time for the disruption" },
      { id: "no-action", label: "No action -- hand used to press the clock is not regulated" },
    ],
    articleRefs: ["FIDE Laws of Chess Article 6.2 -- TO VERIFY"],
  },
  "46b32f09-9b54-4571-9ee8-6ccc86802da2": {
    category: "touch_move_dispute",
    title: "A player touched their own king intending to castle, then changed their mind",
    narrative:
      "White touched the king as if to castle kingside, then paused and instead wants to play a different move entirely. Black insists White must castle if legal.",
    fen: "r1bqk2r/ppp2ppp/2n2n2/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 6",
    options: [
      { id: "must-castle", label: "Require White to castle kingside if legal" },
      { id: "free-choice", label: "Touching the king alone does not commit to castling -- allow any legal king move or other piece" },
      { id: "escalate", label: "Too disputed to rule alone -- escalate to the chief arbiter" },
    ],
    articleRefs: ["FIDE Laws of Chess Article 4.4 -- TO VERIFY"],
  },
  "23b7b41e-7a76-4fff-87b7-094ef36fc923": {
    category: "spectator_interference",
    title: "A departing spectator's phone rings loudly near the board just as a player is about to move",
    narrative:
      "A phone rings loudly from just outside the roped area at a tense moment. The player to move claims it broke their concentration and wants extra time; the opponent objects that the disruption was brief and outside the arbiter's control.",
    options: [
      { id: "grant-time", label: "Grant a small amount of extra time to the disrupted player" },
      { id: "no-time", label: "No time adjustment -- brief external noise is not grounds for one" },
      { id: "warn-hall", label: "No time adjustment, but issue a reminder to spectators about phones" },
    ],
    articleRefs: ["FIDE Laws of Chess Article 11.3 -- TO VERIFY"],
  },
};

const WINDOW_MS = 60_000; // a 1-minute round for QA (the brief's own example is 10 minutes; scaled down so this page is actually testable without waiting)
const ALERT_DELAY_MS = 15_000;
const TIME_SCALE = 8; // wall-clock seconds elapse this many times faster in the simulated round

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Demonstrates Phase 5's own explicit spec end to end: a seeded,
// reproducible timeline that can trigger multiple incidents before any of
// them are resolved (real overlap, not sequential stations), a running
// clock, and a SimulationResult with a real prioritizationScore computed
// from the order incidents were actually handled in.
function DevTimelinePage() {
  const [seed, setSeed] = useState(1);
  const [mode] = useState<IncidentMode>("practice");
  const [events, setEvents] = useState<TimelineEvent[]>(() => generateTimeline(seed, Object.keys(INCIDENTS).map((id) => ({ id, category: INCIDENTS[id].category }))));
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const records = useRef<IncidentAttemptRecord[]>([]);
  const startedAtIso = useRef(new Date().toISOString());
  const lastTick = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = (now: number) => {
      if (lastTick.current !== null) {
        setElapsedMs((prev) => Math.min(WINDOW_MS, prev + (now - lastTick.current!) * TIME_SCALE));
      }
      lastTick.current = now;
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      lastTick.current = null;
    };
  }, [running]);

  useEffect(() => {
    if (elapsedMs >= WINDOW_MS && resolvedIds.size < events.length) {
      setRunning(false);
    }
  }, [elapsedMs, resolvedIds.size, events.length]);

  function regenerate(newSeed: number) {
    setSeed(newSeed);
    setEvents(generateTimeline(newSeed, Object.keys(INCIDENTS).map((id) => ({ id, category: INCIDENTS[id].category }))));
    setRunning(false);
    setElapsedMs(0);
    setResolvedIds(new Set());
    setOpenIncidentId(null);
    setDone(false);
    records.current = [];
    startedAtIso.current = new Date().toISOString();
  }

  const active = getActiveIncidents(events, elapsedMs, resolvedIds);
  const allResolved = resolvedIds.size === events.length;
  const result = done ? buildSimulationResult("dev-timeline-demo", mode, startedAtIso.current, records.current, events) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Timeline QA"
        description="Internal test page for the hall incident engine's timeline runner -- not linked from navigation."
      />
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Seed</label>
          <Input
            type="number"
            value={seed}
            onChange={(e) => regenerate(Number(e.target.value) || 0)}
            className="w-24 h-8"
          />
          <Button size="sm" onClick={() => setRunning((r) => !r)} disabled={done || elapsedMs >= WINDOW_MS}>
            {running ? "Pause" : elapsedMs === 0 ? "Start round" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => regenerate(seed)}>
            Reset
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatMs(elapsedMs)} / {formatMs(WINDOW_MS)} ({TIME_SCALE}x speed)
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          A seeded, reproducible schedule (same seed = same trigger times every time) spreads 3 real incidents across a
          1-minute simulated round. Incidents can be active simultaneously -- respond to whichever you want first; a
          station handled while another was already active and more overdue counts against the final
          prioritizationScore.
        </p>

        {!done && !openIncidentId && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Active incidents</h3>
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {allResolved ? "All incidents resolved." : "None yet -- start the round and wait for one to trigger."}
              </p>
            ) : (
              <div className="grid gap-2">
                {active.map((e) => (
                  <button
                    key={e.incidentId}
                    type="button"
                    onClick={() => setOpenIncidentId(e.incidentId)}
                    className={
                      "text-left text-sm rounded-lg border px-3 py-2 transition hover:bg-muted/40 " +
                      (isAlerted(e, elapsedMs) ? "border-red-500/60 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10")
                    }
                  >
                    <span className="font-medium">{INCIDENTS[e.incidentId].title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {isAlerted(e, elapsedMs) ? "ALERTED -- unhandled since it escalated" : "Live, not yet escalated"} · triggered at{" "}
                      {formatMs(e.triggerAtMs)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {allResolved && (
              <div className="flex justify-end pt-2">
                <Button onClick={() => setDone(true)}>Finish round</Button>
              </div>
            )}
          </div>
        )}

        {!done && openIncidentId && (
          <div className="rounded-xl border border-border bg-card p-4">
            <IncidentPanel
              key={openIncidentId}
              incident={INCIDENTS[openIncidentId]}
              stepId={openIncidentId}
              mode={mode}
              onDone={() => setOpenIncidentId(null)}
              onRecorded={(record) => {
                const event = events.find((e) => e.incidentId === record.incidentId)!;
                records.current = [...records.current, { ...record, noticedUnprompted: !isAlerted(event, elapsedMs) }];
                setResolvedIds((prev) => new Set(prev).add(record.incidentId));
              }}
            />
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">SimulationResult</h3>
            <pre className="text-xs text-muted-foreground overflow-x-auto bg-muted/40 rounded-lg p-3">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

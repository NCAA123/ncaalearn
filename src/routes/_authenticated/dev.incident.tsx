import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { IncidentPanel } from "@/components/simulation/IncidentPanel";
import { buildSimulationResult, type Incident, type IncidentAttemptRecord, type IncidentMode } from "@/lib/incidents";

export const Route = createFileRoute("/_authenticated/dev/incident")({
  head: () => ({ meta: [{ title: "Incident QA — NCAA Academy" }] }),
  component: DevIncidentPage,
});

// Real step id, not a placeholder -- seeded via psql as step 7 of the
// "Board Exercises — Draft Review Set" scenario (see NOTES.md) so this
// page can exercise the actual submitIncidentResponse round trip, not
// just its error path.
const REAL_STEP_ID = "66586057-27b6-4a26-ac77-7d06e769536a";

const SAMPLE_INCIDENT: Incident = {
  category: "touch_move_dispute",
  title: "White claims Black touched the rook before moving the queen",
  narrative:
    "White stops the clock and calls you over. White says Black rested a hand on the h8 rook, then played Qd8 instead. Black denies touching the rook at all. There were no other witnesses at the board; the nearest spectators were several tables away.",
  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3",
  whiteSeconds: 5230,
  blackSeconds: 4110,
  options: [
    { id: "enforce-touch-move", label: "Rule the touch occurred and require Black to move the rook if legal" },
    { id: "insufficient-evidence", label: "No independent witness — let the queen move stand, warn both players" },
    { id: "call-arbiter-team", label: "Too disputed to rule alone — escalate to the chief arbiter" },
  ],
  articleRefs: ["FIDE Laws of Chess Article 4.3 -- TO VERIFY"],
};

// Demonstrates the full Phase 5 shape end to end: a mode toggle
// (practice/assessed), an IncidentPanel wired to record real responses,
// and the resulting SimulationResult -- the "clean, structured result
// object" the brief asks for -- rendered as-is so its shape is checkable.
function DevIncidentPage() {
  const [mode, setMode] = useState<IncidentMode>("practice");
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);
  const records = useRef<IncidentAttemptRecord[]>([]);
  const startedAt = useRef(new Date().toISOString());

  function reset() {
    records.current = [];
    startedAt.current = new Date().toISOString();
    setDone(false);
    setKey((k) => k + 1);
  }

  const result = done ? buildSimulationResult("dev-incident-demo", mode, startedAt.current, records.current) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incident QA"
        description="Internal test page for the HD tournament hall simulator's incident engine -- not linked from navigation."
      />
      <div className="max-w-xl space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "practice" ? "default" : "outline"} onClick={() => setMode("practice")}>
            Practice mode
          </Button>
          <Button size="sm" variant={mode === "assessed" ? "default" : "outline"} onClick={() => setMode("assessed")}>
            Assessed mode
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Practice mode shows the "recorded" confirmation and the draft article reference. Assessed mode withholds
          both -- per the brief's "no hints or highlights, no feedback until the end" -- and advances straight to the
          result below.
        </p>

        {!done && (
          <IncidentPanel
            key={key}
            incident={SAMPLE_INCIDENT}
            stepId={REAL_STEP_ID}
            mode={mode}
            onDone={() => setDone(true)}
            onRecorded={(record) => {
              records.current = [...records.current, record];
              if (mode === "practice") toast.success("Recorded (practice mode) -- 1 of 1 stations done");
            }}
          />
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

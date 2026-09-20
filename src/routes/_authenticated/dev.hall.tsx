import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TournamentHall3D, type HallStep } from "@/components/simulation/TournamentHall3D";
import { IncidentPanel } from "@/components/simulation/IncidentPanel";
import type { Incident } from "@/lib/incidents";

export const Route = createFileRoute("/_authenticated/dev/hall")({
  head: () => ({ meta: [{ title: "Hall QA — NCAA Academy" }] }),
  component: DevHallPage,
});

// Kept small enough that all tables actually sit inside the modeled hall
// shell's 30m length (tableX()'s fixed 5.5m spacing has no awareness of the
// room's real footprint -- 8 tables previously spanned 38.5m, well outside
// the walls, which was invisible in guided-tour mode (camera always frames
// just the active table up close) but broke Free walk mode outright: its
// wall-collision clamp doesn't match where the out-of-bounds tables sat.
const TABLE_COUNT = 5;

const SAMPLE_INCIDENT: Incident = {
  category: "clock_dispute",
  title: "Black claims White's clock wasn't started after the round began",
  narrative:
    "Several minutes into the round, Black raises a hand: White's clock reads the same as at the start, while Black's has been counting down. White insists they pressed it after their first move. No arbiter observed the round's opening moves at this board.",
  whiteSeconds: 5400,
  blackSeconds: 5187,
  options: [
    { id: "credit-time", label: "Credit White the elapsed time and restart both clocks fairly" },
    { id: "no-adjustment", label: "No adjustment -- clocks run as shown, players should have checked" },
    { id: "escalate", label: "Escalate to the chief arbiter for a time-credit ruling" },
  ],
  articleRefs: ["FIDE Laws of Chess Article 6.7 -- TO VERIFY"],
};

const STEPS: HallStep[] = Array.from({ length: TABLE_COUNT }, (_, i) => ({
  id: `table-${i}`,
  prompt: `Board ${i + 1}`,
  context: i === 2 ? { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" } : i === 4 ? { incident: { category: "clock_dispute" } } : null,
}));

// Internal QA page for the HD tournament hall simulator (docs/HALL_SIM_PLAN.md
// Phase 1 acceptance criterion) -- not linked from navigation. Shows the
// Blender-generated hall shell with instanced tables so the GLTF pipeline
// (Phase 1) and the loading/instancing wiring (Phase 2) can be checked
// without needing a real scenario in the database.
function DevHallPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);
  const [mode, setMode] = useState<"tour" | "walk">("tour");
  const [interactingStepId, setInteractingStepId] = useState<string | null>(null);

  const activeStepId = STEPS[activeIndex]?.id ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hall QA"
        description="Internal test page for the HD tournament hall simulator -- not linked from navigation."
      />
      <div className="max-w-4xl space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "tour" ? "default" : "outline"} onClick={() => setMode("tour")}>
            Guided tour
          </Button>
          <Button size="sm" variant={mode === "walk" ? "default" : "outline"} onClick={() => setMode("walk")}>
            Free walk (Phase 3)
          </Button>
        </div>
        <TournamentHall3D
          steps={STEPS}
          activeStepId={activeStepId}
          answeredStepIds={answered}
          mode={mode}
          onInteractStep={(stepId) => setInteractingStepId(stepId)}
        />
        {mode === "tour" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((step, i) => (
                <Button
                  key={step.id}
                  size="sm"
                  variant={i === activeIndex ? "default" : "outline"}
                  onClick={() => {
                    setAnswered((prev) => (prev.includes(activeStepId!) ? prev : [...prev, activeStepId!]));
                    setActiveIndex(i);
                  }}
                >
                  {step.prompt}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clicking a button both advances the camera to that table and marks the previously-active table "done"
              (green ring). Table 3 carries a starting-position FEN to confirm the chess set still renders on a
              GLTF-loaded table.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click the hall to lock the pointer, use WASD/arrows to walk and drag the mouse to look around, or click
            anywhere on the floor to auto-walk there (works without pointer lock, for accessibility). The "Walk to
            station" buttons below the canvas are a fully keyboard-operable alternative. Board 5 (red ring) carries a
            clock-dispute incident -- walk close enough and press E, or click the on-screen prompt, to inspect it.
          </p>
        )}
        {interactingStepId === "table-4" && (
          <div className="rounded-xl border border-border bg-card p-4">
            <IncidentPanel
              incident={SAMPLE_INCIDENT}
              stepId="00000000-0000-0000-0000-000000000000"
              onDone={() => setInteractingStepId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

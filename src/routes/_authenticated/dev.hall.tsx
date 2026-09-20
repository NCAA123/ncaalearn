import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TournamentHall3D, type HallStep } from "@/components/simulation/TournamentHall3D";

export const Route = createFileRoute("/_authenticated/dev/hall")({
  head: () => ({ meta: [{ title: "Hall QA — NCAA Academy" }] }),
  component: DevHallPage,
});

const TABLE_COUNT = 8;

const STEPS: HallStep[] = Array.from({ length: TABLE_COUNT }, (_, i) => ({
  id: `table-${i}`,
  prompt: `Board ${i + 1}`,
  context: i === 2 ? { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" } : null,
}));

// Internal QA page for the HD tournament hall simulator (docs/HALL_SIM_PLAN.md
// Phase 1 acceptance criterion) -- not linked from navigation. Shows the
// Blender-generated hall shell with instanced tables so the GLTF pipeline
// (Phase 1) and the loading/instancing wiring (Phase 2) can be checked
// without needing a real scenario in the database.
function DevHallPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);

  const activeStepId = STEPS[activeIndex]?.id ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hall QA"
        description="Internal test page for the HD tournament hall simulator -- not linked from navigation."
      />
      <div className="max-w-4xl space-y-4">
        <TournamentHall3D steps={STEPS} activeStepId={activeStepId} answeredStepIds={answered} />
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
          Clicking a button both advances the camera to that table and marks the previously-active table "done" (green
          ring). Table 3 carries a starting-position FEN to confirm the chess set still renders on a GLTF-loaded table.
        </p>
      </div>
    </div>
  );
}

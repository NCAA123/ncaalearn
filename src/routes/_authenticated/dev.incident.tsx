import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentPanel } from "@/components/simulation/IncidentPanel";
import type { Incident } from "@/lib/incidents";

export const Route = createFileRoute("/_authenticated/dev/incident")({
  head: () => ({ meta: [{ title: "Incident QA — NCAA Academy" }] }),
  component: DevIncidentPage,
});

// Sample incident for UI/flow QA -- note this renders against a real
// server function (submitIncidentResponse), which loads the step's
// incident from academy_scenario_steps by id. There is no seeded step with
// this id, so "Submit response" here will surface that error, which is
// itself useful confirmation the server function's validation path works.
// A real end-to-end pass needs a seeded scenario step (see NOTES.md /
// board-exercise seed content for the established pattern).
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

function DevIncidentPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Incident QA"
        description="Internal test page for the HD tournament hall simulator's incident engine -- not linked from navigation."
      />
      <div className="max-w-xl">
        <IncidentPanel
          incident={SAMPLE_INCIDENT}
          stepId="00000000-0000-0000-0000-000000000000"
          onDone={() => toast.success("Next station (QA page has no real station queue)")}
        />
      </div>
    </div>
  );
}

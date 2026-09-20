import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { InteractiveBoard } from "@/components/learning/InteractiveBoard";

export const Route = createFileRoute("/_authenticated/dev/board")({
  head: () => ({ meta: [{ title: "Board QA — NCAA Academy" }] }),
  component: DevBoardPage,
});

// Internal QA page for the HD chess board simulator (docs/BOARD_SIM_PLAN.md).
// Not linked from any nav -- reachable by URL for manual testing of piece
// geometry, move animation, click/drag interactivity, and camera presets
// without needing real practice/exam/lesson content in the database.
function DevBoardPage() {
  const [log, setLog] = useState<string[]>([]);

  return (
    <div>
      <PageHeader
        title="Board QA"
        description="Internal test page for the HD chess board simulator -- not linked from navigation."
      />
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 max-w-4xl">
        <InteractiveBoard
          onMove={(move, fen) => setLog((l) => [`${move.from}→${move.to}${move.promotion ? `=${move.promotion}` : ""}  (${fen})`, ...l].slice(0, 20))}
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Move log</h3>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">Click or drag a piece to move it. Legal targets show a green dot; illegal drops/clicks are ignored.</p>
          ) : (
            <ol className="text-xs font-mono space-y-1 text-muted-foreground">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

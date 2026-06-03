import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, SkipBack, SkipForward } from "lucide-react";

// Lightweight PGN viewer: steps through the mainline move-by-move.
// Accepts a PGN string. Falls back to a playable empty board if PGN is invalid.
export function ChessViewer({ pgn }: { pgn: string }) {
  const moves = useMemo(() => {
    try {
      const g = new Chess();
      // chess.js accepts loose PGN; strip header noise just in case.
      g.loadPgn(pgn, { strict: false } as never);
      return g.history({ verbose: true }) as Array<{ from: string; to: string; san: string; promotion?: string }>;
    } catch {
      return [];
    }
  }, [pgn]);

  const [ply, setPly] = useState(0);

  const position = useMemo(() => {
    const g = new Chess();
    for (let i = 0; i < ply; i++) {
      const m = moves[i];
      if (!m) break;
      g.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    return g.fen();
  }, [moves, ply]);

  useEffect(() => setPly(0), [pgn]);

  const sanList = moves.map((m) => m.san);

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="aspect-square w-full max-w-[520px] mx-auto">
          <Chessboard options={{ position, boardOrientation: "white", allowDragging: false }} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Button size="icon" variant="outline" onClick={() => setPly(0)} disabled={ply === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setPly((p) => Math.min(moves.length, p + 1))} disabled={ply >= moves.length}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setPly(moves.length)} disabled={ply >= moves.length}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setPly(0)} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-xs font-medium text-muted-foreground">
          Moves ({sanList.length})
        </div>
        <ol className="max-h-[420px] overflow-y-auto text-sm">
          {sanList.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground italic">No moves found in PGN.</li>
          ) : (
            sanList.map((san, i) => {
              const moveNo = Math.floor(i / 2) + 1;
              const isWhite = i % 2 === 0;
              const active = ply === i + 1;
              return (
                <li key={i}>
                  <button
                    onClick={() => setPly(i + 1)}
                    className={
                      "w-full text-left px-3 py-1.5 font-mono text-xs flex items-center gap-2 transition " +
                      (active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    {isWhite ? <span className="opacity-50 w-6">{moveNo}.</span> : <span className="w-6" />}
                    <span>{san}</span>
                  </button>
                </li>
              );
            })
          )}
        </ol>
      </div>
    </div>
  );
}
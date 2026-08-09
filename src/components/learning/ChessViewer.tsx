import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FlipVertical2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";

// Lightweight PGN viewer: steps through the mainline move-by-move.
// Accepts a PGN string. Falls back to a playable empty board if PGN is invalid.
export function ChessViewer({
  pgn,
  startFen,
  initialOrientation = "white",
}: {
  pgn: string;
  startFen?: string | null;
  initialOrientation?: "white" | "black";
}) {
  const moves = useMemo(() => {
    try {
      const g = new Chess();
      // chess.js accepts loose PGN; strip header noise just in case.
      g.loadPgn(pgn, { strict: false } as never);
      const history = g.history({ verbose: true }) as Array<{
        from: string;
        to: string;
        san: string;
        promotion?: string;
      }>;
      const comments = new Map<number, string>();
      try {
        const raw = (g as unknown as { getComments: () => Array<{ fen: string; comment: string }> }).getComments();
        const replay = new Chess();
        history.forEach((m, i) => {
          replay.move({ from: m.from, to: m.to, promotion: m.promotion });
          const hit = raw.find((c) => c.fen === replay.fen());
          if (hit) comments.set(i, hit.comment.trim());
        });
      } catch {
        /* comments unsupported */
      }
      return { history, comments };
    } catch {
      return { history: [], comments: new Map<number, string>() };
    }
  }, [pgn]);

  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">(initialOrientation);
  const [showCoords, setShowCoords] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { position, lastMove } = useMemo(() => {
    const g = new Chess();
    if (startFen) {
      try {
        g.load(startFen);
      } catch {
        /* invalid FEN — keep start position */
      }
    }
    let last: { from: string; to: string } | null = null;
    for (let i = 0; i < ply; i++) {
      const m = moves.history[i];
      if (!m) break;
      g.move({ from: m.from, to: m.to, promotion: m.promotion });
      last = { from: m.from, to: m.to };
    }
    return { position: g.fen(), lastMove: last };
  }, [moves, ply, startFen]);

  useEffect(() => setPly(0), [pgn]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!playing) return;
    timer.current = setInterval(() => {
      setPly((p) => {
        if (p >= moves.history.length) {
          setPlaying(false);
          return p;
        }
        return p + 1;
      });
    }, speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed, moves.history.length]);

  const sanList = moves.history.map((m) => m.san);
  const activeComment = ply > 0 ? moves.comments.get(ply - 1) : undefined;
  const squareStyles = lastMove
    ? {
        [lastMove.from]: { background: "hsl(var(--primary) / 0.25)" },
        [lastMove.to]: { background: "hsl(var(--primary) / 0.35)" },
      }
    : {};

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-4">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="aspect-square w-full max-w-[520px] mx-auto">
          <Chessboard
            options={{
              position,
              boardOrientation: orientation,
              allowDragging: false,
              showNotation: showCoords,
              squareStyles,
            } as never}
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Button size="icon" variant="outline" onClick={() => setPly(0)} disabled={ply === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={playing ? "default" : "outline"}
            onClick={() => setPlaying((p) => !p)}
            disabled={moves.history.length === 0}
            title="Auto-play"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPly((p) => Math.min(moves.history.length, p + 1))}
            disabled={ply >= moves.history.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPly(moves.history.length)}
            disabled={ply >= moves.history.length}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            title="Flip board"
          >
            <FlipVertical2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setPlaying(false); setPly(0); }} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={showCoords} onChange={(e) => setShowCoords(e.target.checked)} />
            Coordinates
          </label>
          <label className="inline-flex items-center gap-1.5">
            Speed
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-transparent border border-border rounded px-1 py-0.5"
            >
              <option value={2000}>0.5x</option>
              <option value={1200}>1x</option>
              <option value={700}>2x</option>
              <option value={350}>4x</option>
            </select>
          </label>
        </div>
        {activeComment && (
          <p className="mt-3 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-foreground">
            {activeComment}
          </p>
        )}
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
                    onClick={() => { setPlaying(false); setPly(i + 1); }}
                    className={
                      "w-full text-left px-3 py-1.5 font-mono text-xs flex items-center gap-2 transition " +
                      (active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    {isWhite ? <span className="opacity-50 w-6">{moveNo}.</span> : <span className="w-6" />}
                    <span>{san}</span>
                    {moves.comments.has(i) && <span className="ml-auto text-primary">•</span>}
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
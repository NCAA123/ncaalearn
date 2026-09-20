import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Box, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chess3DBoard, type ChessMove } from "@/components/learning/Chess3DBoard";

// A self-contained, playable board: the candidate can click or drag pieces
// to make legal moves, in either 2D or 3D. Unlike ChessSet/ChessViewer
// (controlled, read-only replay), this owns its own chess.js game instance
// -- built for board exercises (reconstruct a position, answer from a live
// position, etc.) rather than for stepping through a fixed PGN. Every move
// is validated by chess.js before being applied; illegal drops/clicks are
// silently rejected (react-chessboard's onPieceDrop returning false snaps
// the piece back).
export function InteractiveBoard({
  initialFen,
  orientation = "white",
  disabled = false,
  onMove,
}: {
  initialFen?: string;
  orientation?: "white" | "black";
  disabled?: boolean;
  onMove?: (move: { from: string; to: string; promotion?: string }, fen: string) => void;
}) {
  const [fen, setFen] = useState(initialFen ?? new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view3D, setView3D] = useState(false);

  useEffect(() => {
    setFen(initialFen ?? new Chess().fen());
    setLastMove(null);
    setSelected(null);
  }, [initialFen]);

  const game = useMemo(() => {
    const g = new Chess();
    try {
      g.load(fen);
    } catch {
      /* keep default start position on bad fen */
    }
    return g;
  }, [fen]);

  function applyMove(from: string, to: string, promotion?: string): boolean {
    if (disabled) return false;
    const copy = new Chess(game.fen());
    let result;
    try {
      result = copy.move({ from, to, promotion: promotion ?? "q" });
    } catch {
      return false;
    }
    if (!result) return false;
    const newFen = copy.fen();
    setFen(newFen);
    setLastMove({ from, to });
    setSelected(null);
    onMove?.({ from, to, promotion: result.promotion }, newFen);
    return true;
  }

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    try {
      const moves = game.moves({ square: selected as never, verbose: true }) as { to: string }[];
      return new Set(moves.map((m) => m.to));
    } catch {
      return new Set<string>();
    }
  }, [game, selected]);

  function handleSquareClick({ square }: { square: string }) {
    if (disabled) return;
    if (selected && legalTargets.has(square)) {
      applyMove(selected, square);
      return;
    }
    const piece = game.get(square as never);
    if (piece && piece.color === game.turn()) {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  }

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { background: "hsl(var(--primary) / 0.2)" };
    squareStyles[lastMove.to] = { background: "hsl(var(--primary) / 0.3)" };
  }
  if (selected) {
    squareStyles[selected] = { ...(squareStyles[selected] ?? {}), background: "hsl(217 91% 60% / 0.35)" };
  }
  for (const sq of legalTargets) {
    squareStyles[sq] = {
      ...(squareStyles[sq] ?? {}),
      backgroundImage: "radial-gradient(circle, hsl(142 71% 30% / 0.55) 22%, transparent 24%)",
    };
  }

  function reset() {
    setFen(initialFen ?? new Chess().fen());
    setLastMove(null);
    setSelected(null);
  }

  return (
    <div className="space-y-2">
      {view3D ? (
        <Chess3DBoard
          fen={fen}
          orientation={orientation}
          lastMove={lastMove}
          interactive={!disabled}
          showCameraPresets
          onMove={(m: ChessMove) => applyMove(m.from, m.to, m.promotion)}
        />
      ) : (
        <div className="aspect-square w-full max-w-[520px] mx-auto">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: !disabled,
              squareStyles,
              onSquareClick: handleSquareClick,
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? applyMove(sourceSquare, targetSquare) : false,
            }}
          />
        </div>
      )}
      <div className="flex items-center justify-center gap-1.5">
        <Button
          size="icon"
          variant={view3D ? "default" : "outline"}
          onClick={() => setView3D((v) => !v)}
          title={view3D ? "Switch to 2D board" : "Switch to 3D board"}
        >
          {view3D ? <Square className="h-4 w-4" /> : <Box className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={reset} title="Reset to starting position" disabled={disabled}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

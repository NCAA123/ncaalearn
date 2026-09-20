import type { SquareRenderer } from "react-chessboard";

// react-chessboard's default squares render with no accessible name at all
// (confirmed live: every square shows up as an unlabelled <button> to a
// screen reader). This squareRenderer wraps its children with a proper
// aria-label -- "e4, White pawn" / "e4, empty" -- without touching drag/
// drop/click behavior, which the library still wires up on `children`.
const PIECE_NAMES: Record<string, string> = {
  P: "pawn",
  N: "knight",
  B: "bishop",
  R: "rook",
  Q: "queen",
  K: "king",
};

function describeSquare(square: string, piece: { pieceType: string } | null): string {
  if (!piece) return `${square}, empty`;
  const color = piece.pieceType[0] === "w" ? "White" : "Black";
  const name = PIECE_NAMES[piece.pieceType[1]] ?? "piece";
  return `${square}, ${color} ${name}`;
}

export const accessibleSquareRenderer: SquareRenderer = ({ piece, square, children }) => (
  <div role="gridcell" aria-label={describeSquare(square, piece)} style={{ width: "100%", height: "100%" }}>
    {children}
  </div>
);

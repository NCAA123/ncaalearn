import * as THREE from "three";

// Procedural Staunton-style piece geometry, generated once per piece type via
// THREE.LatheGeometry revolves (everything except the knight, which is a
// lathed body + a separate carved "head" block -- a real knight silhouette
// needs a non-lathe profile). No external models/textures: this is the
// dependency-free fallback the HD-board brief allows when Blender/CC0 GLB
// assets aren't available yet (see docs/BOARD_SIM_PLAN.md). Geometries are
// built once and shared across every piece instance of the same type.

export type PieceSymbol = "p" | "n" | "b" | "r" | "q" | "k";

const LATHE_SEGMENTS = 24;

function lathe(points: [number, number][]) {
  const vec2s = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(vec2s, LATHE_SEGMENTS);
}

// Each profile is a list of (radius, height) points from base to top,
// traced up one side -- LatheGeometry revolves it 360° around the Y axis.
const PROFILES: Record<Exclude<PieceSymbol, "n">, [number, number][]> = {
  p: [
    [0, 0],
    [0.3, 0],
    [0.3, 0.05],
    [0.16, 0.1],
    [0.16, 0.32],
    [0.24, 0.38],
    [0.1, 0.46],
    [0, 0.5],
  ],
  r: [
    [0, 0],
    [0.32, 0],
    [0.32, 0.06],
    [0.2, 0.1],
    [0.2, 0.5],
    [0.28, 0.54],
    [0.28, 0.6],
    [0.22, 0.6],
    [0.22, 0.66],
    [0.28, 0.66],
    [0.28, 0.72],
    [0, 0.72],
  ],
  b: [
    [0, 0],
    [0.31, 0],
    [0.31, 0.06],
    [0.17, 0.1],
    [0.17, 0.4],
    [0.26, 0.5],
    [0.16, 0.68],
    [0.06, 0.78],
    [0, 0.82],
  ],
  q: [
    [0, 0],
    [0.34, 0],
    [0.34, 0.06],
    [0.19, 0.1],
    [0.19, 0.48],
    [0.29, 0.6],
    [0.14, 0.84],
    [0.2, 0.92],
    [0, 0.98],
  ],
  k: [
    [0, 0],
    [0.34, 0],
    [0.34, 0.06],
    [0.19, 0.1],
    [0.19, 0.5],
    [0.28, 0.62],
    [0.15, 0.86],
    [0.15, 0.98],
    [0, 1.0],
  ],
};

let cachedGeometries: Record<PieceSymbol, THREE.BufferGeometry> | null = null;

// Lazily build (and cache) one shared geometry per piece type. Call this
// once per module lifetime -- geometries are immutable and shared across
// every piece on the board and every board on screen (lessons, exams,
// practice, the hall's tables), so there's no per-piece geometry cost.
export function getPieceGeometries(): Record<PieceSymbol, THREE.BufferGeometry> {
  if (cachedGeometries) return cachedGeometries;

  const knightBody = lathe([
    [0, 0],
    [0.32, 0],
    [0.32, 0.06],
    [0.19, 0.1],
    [0.19, 0.3],
    [0, 0.34],
  ]);
  const knightHead = new THREE.BoxGeometry(0.16, 0.28, 0.34);
  // Bevel the head block slightly by scaling a copy of its top face inward
  // via a shear -- gives a rough "muzzle" silhouette instead of a plain box.
  const pos = knightHead.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      pos.setZ(i, pos.getZ(i) * 0.55);
      pos.setX(i, pos.getX(i) + 0.08);
    }
  }
  pos.needsUpdate = true;
  knightHead.computeVertexNormals();
  knightHead.translate(0.05, 0.5, 0);
  const knight = mergeGeometries([knightBody, knightHead]);

  cachedGeometries = {
    p: lathe(PROFILES.p),
    r: lathe(PROFILES.r),
    b: lathe(PROFILES.b),
    q: lathe(PROFILES.q),
    k: lathe(PROFILES.k),
    n: knight,
  };
  return cachedGeometries;
}

// Minimal non-indexed merge (BufferGeometryUtils isn't worth pulling in for
// two geometries) -- concatenates position/normal attributes.
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  for (const geo of geometries) {
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
    const p = nonIndexed.attributes.position;
    const n = nonIndexed.attributes.normal ?? (nonIndexed.computeVertexNormals(), nonIndexed.attributes.normal);
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return merged;
}

export const PIECE_HEIGHT: Record<PieceSymbol, number> = {
  p: 0.5,
  n: 0.62,
  b: 0.82,
  r: 0.72,
  q: 0.98,
  k: 1.0,
};

// ── Move-diff animation ────────────────────────────────────────────────
// ChessSet only ever receives a `fen` (a full board snapshot) plus an
// optional `lastMove` hint -- never a move list -- because it's shared by
// the lesson viewer (which can jump many plies at once via step controls),
// exam questions, practice, and the hall. To animate a single-ply move
// (piece travels, captured piece fades) without ever animating a multi-ply
// jump as if it were one move, we diff two board snapshots ourselves and
// only produce a flight plan when the diff looks like exactly one legal
// move's worth of change -- otherwise callers should snap instantly.

export type Color = "w" | "b";
export type BoardMap = Map<string, { type: PieceSymbol; color: Color }>;

export function fenToBoardMap(board: { square: string; type: PieceSymbol; color: Color }[]): BoardMap {
  const map: BoardMap = new Map();
  for (const sq of board) map.set(sq.square, { type: sq.type, color: sq.color });
  return map;
}

export type PieceFlight = {
  key: string;
  type: PieceSymbol;
  color: Color;
  from: string;
  to: string;
};

export type PieceFade = {
  key: string;
  type: PieceSymbol;
  color: Color;
  square: string;
};

export type MoveDiff = { flights: PieceFlight[]; fades: PieceFade[] };

const MAX_DIFF_SQUARES = 4;

// Categorizes the change between two board snapshots into: pieces that
// travel from one square to another (flights — normal moves, castling's
// rook, promotion's pawn-becomes-queen), and pieces that just disappear in
// place (fades — a captured piece, or a captured-en-passant pawn). Returns
// an empty diff (meaning: caller should snap instantly) when the change is
// too large to be a single move (e.g. the viewer jumped several plies) or
// when pairing is ambiguous.
export function diffBoards(prev: BoardMap, next: BoardMap, lastMove?: { from: string; to: string } | null): MoveDiff {
  const vacatedEmpty: string[] = [];
  const occupiedNew: string[] = [];
  const changed: string[] = [];

  for (const [sq, piece] of prev) {
    const n = next.get(sq);
    if (!n) vacatedEmpty.push(sq);
    else if (n.type !== piece.type || n.color !== piece.color) changed.push(sq);
  }
  for (const sq of next.keys()) {
    if (!prev.has(sq)) occupiedNew.push(sq);
  }

  const totalChanged = vacatedEmpty.length + occupiedNew.length + changed.length;
  if (totalChanged === 0 || totalChanged > MAX_DIFF_SQUARES) return { flights: [], fades: [] };

  const flights: PieceFlight[] = [];
  const fades: PieceFade[] = [];
  const remainingOrigins = new Set(vacatedEmpty);

  // Squares whose occupant changed are capture destinations: the old
  // occupant fades in place, the new occupant flies in from a vacated
  // origin of matching type/color (falling back to the lastMove hint).
  for (const sq of changed) {
    const captured = prev.get(sq)!;
    fades.push({ key: `fade-${sq}`, type: captured.type, color: captured.color, square: sq });

    const attacker = next.get(sq)!;
    let origin = lastMove?.to === sq && remainingOrigins.has(lastMove.from) ? lastMove.from : undefined;
    if (!origin) {
      origin = [...remainingOrigins].find((o) => {
        const p = prev.get(o)!;
        return p.type === attacker.type && p.color === attacker.color;
      });
    }
    if (!origin) return { flights: [], fades: [] }; // ambiguous — snap instead
    remainingOrigins.delete(origin);
    flights.push({ key: `fly-${origin}-${sq}`, type: attacker.type, color: attacker.color, from: origin, to: sq });
  }

  // Remaining vacated origins pair with newly-occupied destinations —
  // normal moves, promotion (type may differ, same color), or castling's
  // second piece (the rook).
  const remainingDestinations = new Set(occupiedNew);
  for (const origin of remainingOrigins) {
    const piece = prev.get(origin)!;
    let dest = lastMove?.from === origin && remainingDestinations.has(lastMove.to) ? lastMove.to : undefined;
    if (!dest) {
      dest = [...remainingDestinations].find((d) => next.get(d)!.color === piece.color);
    }
    if (!dest) {
      // No destination anywhere (e.g. the captured pawn in an en passant
      // capture) — it just vanishes in place.
      fades.push({ key: `fade-${origin}`, type: piece.type, color: piece.color, square: origin });
      continue;
    }
    remainingDestinations.delete(dest);
    const landed = next.get(dest)!;
    flights.push({ key: `fly-${origin}-${dest}`, type: landed.type, color: landed.color, from: origin, to: dest });
  }

  return { flights, fades };
}

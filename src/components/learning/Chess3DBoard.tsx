import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Chess } from "chess.js";
import {
  getPieceGeometries,
  fenToBoardMap,
  diffBoards,
  type PieceSymbol as StauntonPieceSymbol,
  type BoardMap,
  type PieceFlight,
  type PieceFade,
} from "@/lib/chess-pieces";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type PieceSymbol = "p" | "n" | "b" | "r" | "q" | "k";
type Color = "w" | "b";
type BoardSquare = { square: string; type: PieceSymbol; color: Color } | null;

// a1..h8 -> world (x, z). Board is centred at the origin; rank 1 sits at
// +z (the near edge from White's default camera position), rank 8 at -z.
function squareToXZ(square: string): [number, number] {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]) - 1;
  return [file - 3.5, 3.5 - rank];
}

export type CameraPreset = "white" | "black" | "top";

const CAMERA_PRESETS: Record<CameraPreset, [number, number, number]> = {
  white: [0, 7.5, 7],
  black: [0, 7.5, -7],
  top: [0, 12, 0.01],
};

// `presetRequest` is a mutable ref the outside (non-Canvas) UI writes to when
// a camera-preset button is clicked; Controls lerps toward it each frame
// until close enough, then clears it so free orbiting resumes normally.
function Controls({ presetRequest }: { presetRequest: { current: CameraPreset | null } }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.5;
    controls.maxDistance = 13;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;
    return () => controls.dispose();
  }, [camera, gl]);

  useFrame(() => {
    const preset = presetRequest.current;
    if (preset) {
      const [tx, ty, tz] = CAMERA_PRESETS[preset];
      camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.12);
      controlsRef.current?.target.set(0, 0, 0);
      if (camera.position.distanceTo(new THREE.Vector3(tx, ty, tz)) < 0.05) {
        presetRequest.current = null;
      }
    }
    controlsRef.current?.update();
  });
  return null;
}

function Board({
  highlight,
  selected,
  legalTargets,
  onSquareClick,
}: {
  highlight: { from: string; to: string } | null;
  selected?: string | null;
  legalTargets?: Set<string>;
  onSquareClick?: (square: string) => void;
}) {
  const squares = useMemo(() => {
    const list: { key: string; x: number; z: number; dark: boolean }[] = [];
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const square = `${String.fromCharCode(97 + file)}${rank + 1}`;
        const [x, z] = squareToXZ(square);
        list.push({ key: square, x, z, dark: (file + rank) % 2 === 0 });
      }
    }
    return list;
  }, []);

  const lightMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8d9b5", roughness: 0.85 }),
    [],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#9c6b43", roughness: 0.85 }),
    [],
  );
  const highlightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f5c451",
        emissive: "#f5c451",
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );
  const selectedMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4fa8f0",
        emissive: "#4fa8f0",
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5,
      }),
    [],
  );
  const dotMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2f6f3e", emissive: "#2f6f3e", emissiveIntensity: 0.4 }),
    [],
  );

  return (
    <group>
      {squares.map((sq) => (
        <mesh
          key={sq.key}
          position={[sq.x, 0, sq.z]}
          receiveShadow
          material={sq.dark ? darkMat : lightMat}
          onClick={
            onSquareClick
              ? (e) => {
                  e.stopPropagation();
                  onSquareClick(sq.key);
                }
              : undefined
          }
        >
          <boxGeometry args={[1, 0.2, 1]} />
        </mesh>
      ))}
      {highlight &&
        [highlight.from, highlight.to].map((sq) => {
          const [x, z] = squareToXZ(sq);
          return (
            <mesh key={`hl-${sq}`} position={[x, 0.105, z]} rotation={[-Math.PI / 2, 0, 0]} material={highlightMat}>
              <planeGeometry args={[0.92, 0.92]} />
            </mesh>
          );
        })}
      {selected &&
        (() => {
          const [x, z] = squareToXZ(selected);
          return (
            <mesh position={[x, 0.107, z]} rotation={[-Math.PI / 2, 0, 0]} material={selectedMat}>
              <planeGeometry args={[0.92, 0.92]} />
            </mesh>
          );
        })()}
      {legalTargets &&
        [...legalTargets].map((sq) => {
          const [x, z] = squareToXZ(sq);
          return (
            <mesh key={`dot-${sq}`} position={[x, 0.13, z]} material={dotMat}>
              <sphereGeometry args={[0.13, 16, 16]} />
            </mesh>
          );
        })}
    </group>
  );
}

// Shared across every piece on every board on screen: one geometry per
// piece type, one material per color. See src/lib/chess-pieces.ts for how
// the Staunton profiles are built (LatheGeometry revolves, no external
// models/textures needed).
const whiteMaterial = new THREE.MeshStandardMaterial({
  color: "#f4ecd8",
  roughness: 0.4,
  metalness: 0.05,
});
const blackMaterial = new THREE.MeshStandardMaterial({
  color: "#2c2a28",
  roughness: 0.4,
  metalness: 0.05,
});

function pieceRotationY(type: PieceSymbol, color: Color) {
  // Knight faces toward the opponent's side of the board (+z for white,
  // -z after the set-level 180° flip for black orientation).
  return type === "n" ? (color === "w" ? Math.PI / 2 : -Math.PI / 2) : 0;
}

function Piece({
  square,
  type,
  color,
  onClick,
}: {
  square: string;
  type: PieceSymbol;
  color: Color;
  onClick?: (square: string) => void;
}) {
  const [x, z] = squareToXZ(square);
  const geometries = useMemo(() => getPieceGeometries(), []);
  const geometry = geometries[type as StauntonPieceSymbol];
  const material = color === "w" ? whiteMaterial : blackMaterial;

  return (
    <mesh
      position={[x, 0.1, z]}
      rotation={[0, pieceRotationY(type, color), 0]}
      geometry={geometry}
      material={material}
      scale={0.72}
      castShadow
      receiveShadow
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick(square);
            }
          : undefined
      }
    />
  );
}

const FLIGHT_MS = 260;
const FADE_MS = 220;

// A piece travelling from one square to another: lerps x/z, arcs up in y,
// eased out. Uses the same shared geometry/material as static pieces.
function FlyingPiece({ flight, onDone }: { flight: PieceFlight; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);
  const geometries = useMemo(() => getPieceGeometries(), []);
  const geometry = geometries[flight.type as StauntonPieceSymbol];
  const material = flight.color === "w" ? whiteMaterial : blackMaterial;
  const [fx, fz] = squareToXZ(flight.from);
  const [tx, tz] = squareToXZ(flight.to);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = 0;
    startRef.current += delta * 1000;
    const t = Math.min(1, startRef.current / FLIGHT_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    ref.current.position.x = fx + (tx - fx) * eased;
    ref.current.position.z = fz + (tz - fz) * eased;
    ref.current.position.y = 0.1 + Math.sin(eased * Math.PI) * 0.45;
    if (t >= 1) onDone();
  });

  return (
    <mesh
      ref={ref}
      position={[fx, 0.1, fz]}
      rotation={[0, pieceRotationY(flight.type, flight.color), 0]}
      geometry={geometry}
      material={material}
      scale={0.72}
      castShadow
      receiveShadow
    />
  );
}

// A captured piece (or an en-passant-captured pawn) shrinking away in place.
function FadingPiece({ fade, onDone }: { fade: PieceFade; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);
  const geometries = useMemo(() => getPieceGeometries(), []);
  const geometry = geometries[fade.type as StauntonPieceSymbol];
  const material = fade.color === "w" ? whiteMaterial : blackMaterial;
  const [x, z] = squareToXZ(fade.square);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = 0;
    startRef.current += delta * 1000;
    const t = Math.min(1, startRef.current / FADE_MS);
    const scale = 0.72 * (1 - t);
    ref.current.scale.setScalar(scale);
    ref.current.position.y = 0.1 - t * 0.15;
    if (t >= 1) onDone();
  });

  return (
    <mesh
      ref={ref}
      position={[x, 0.1, z]}
      rotation={[0, pieceRotationY(fade.type, fade.color), 0]}
      geometry={geometry}
      material={material}
      scale={0.72}
    />
  );
}

// A full chess set (board + pieces) as a single group other scenes — e.g.
// the tournament hall — can embed at any position/scale. Not wrapped in its
// own <Canvas>: <Canvas> elements can't nest, so anything placing this
// inside a bigger scene must already be inside one.
export type ChessMove = { from: string; to: string; promotion?: string };

export function ChessSet({
  fen,
  orientation = "white",
  lastMove,
  interactive = false,
  onMove,
}: {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  /** Lets the side to move click a piece then a highlighted square to move it.
   *  ChessSet stays a controlled component: it never mutates its own board —
   *  it just reports the attempted move via onMove and waits for a new fen. */
  interactive?: boolean;
  onMove?: (move: ChessMove) => void;
}) {
  const game = useMemo(() => {
    const g = new Chess();
    try {
      g.load(fen);
    } catch {
      /* invalid fen -- board renders empty, interactivity no-ops */
    }
    return g;
  }, [fen]);
  const board = useMemo(() => game.board() as unknown as BoardSquare[][], [game]);
  const pieces = useMemo(() => board.flat().filter((sq): sq is NonNullable<BoardSquare> => !!sq), [board]);

  const reducedMotion = usePrefersReducedMotion();
  const prevBoardRef = useRef<BoardMap | null>(null);
  const [flights, setFlights] = useState<PieceFlight[]>([]);
  const [fades, setFades] = useState<PieceFade[]>([]);

  useEffect(() => {
    const nextMap = fenToBoardMap(pieces);
    const prevMap = prevBoardRef.current;
    if (prevMap && !reducedMotion) {
      const diff = diffBoards(prevMap, nextMap, lastMove ?? null);
      setFlights(diff.flights);
      setFades(diff.fades);
    } else {
      setFlights([]);
      setFades([]);
    }
    prevBoardRef.current = nextMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const animatingSquares = useMemo(
    () => new Set([...flights.map((f) => f.to), ...fades.map((f) => f.square)]),
    [flights, fades],
  );
  const staticPieces = pieces.filter((p) => !animatingSquares.has(p.square));

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [fen]);

  const legalTargets = useMemo(() => {
    if (!selected) return undefined;
    try {
      const moves = game.moves({ square: selected as never, verbose: true }) as { to: string }[];
      return new Set(moves.map((m) => m.to));
    } catch {
      return undefined;
    }
  }, [game, selected]);

  function handleSquareOrPieceClick(square: string) {
    if (!interactive) return;
    const piece = game.get(square as never);
    if (selected && legalTargets?.has(square)) {
      const movingPiece = game.get(selected as never);
      const isPromotion =
        movingPiece?.type === "p" && (square[1] === "8" || square[1] === "1");
      onMove?.({ from: selected, to: square, promotion: isPromotion ? "q" : undefined });
      setSelected(null);
      return;
    }
    if (piece && piece.color === game.turn()) {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  }

  return (
    <group rotation={[0, orientation === "black" ? Math.PI : 0, 0]}>
      <Board
        highlight={lastMove ?? null}
        selected={interactive ? selected : null}
        legalTargets={interactive ? legalTargets : undefined}
        onSquareClick={interactive ? handleSquareOrPieceClick : undefined}
      />
      {staticPieces.map((p) => (
        <Piece
          key={p.square}
          square={p.square}
          type={p.type}
          color={p.color}
          onClick={interactive ? handleSquareOrPieceClick : undefined}
        />
      ))}
      {flights.map((f) => (
        <FlyingPiece key={f.key} flight={f} onDone={() => setFlights((cur) => cur.filter((x) => x.key !== f.key))} />
      ))}
      {fades.map((f) => (
        <FadingPiece key={f.key} fade={f} onDone={() => setFades((cur) => cur.filter((x) => x.key !== f.key))} />
      ))}
    </group>
  );
}

// Simple stylised 3D board — geometric pieces (no external models/textures,
// so it renders identically offline and never depends on a network fetch).
// Drag to orbit, scroll to zoom.
export function Chess3DBoard({
  fen,
  orientation = "white",
  lastMove,
  interactive = false,
  onMove,
  showCameraPresets = false,
}: {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  onMove?: (move: ChessMove) => void;
  /** Adds White/Black/Top camera-angle buttons below the board. */
  showCameraPresets?: boolean;
}) {
  // See the same nudge in TournamentHall3D — R3F's canvas-size
  // ResizeObserver can miss the container's first layout pass.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, []);

  const presetRequest = useRef<CameraPreset | null>(null);

  return (
    <div className="w-full max-w-[520px] mx-auto">
      <div className="aspect-square w-full rounded-xl overflow-hidden border border-border bg-muted">
        <Canvas shadows camera={{ position: [0, 7.5, 7], fov: 42 }}>
          <color attach="background" args={["#1c1917"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 4]} intensity={1.1} castShadow />
          <ChessSet fen={fen} orientation={orientation} lastMove={lastMove} interactive={interactive} onMove={onMove} />
          <Controls presetRequest={presetRequest} />
        </Canvas>
      </div>
      {showCameraPresets && (
        <div className="mt-2 flex justify-center gap-1.5 text-xs">
          {(["white", "black", "top"] as CameraPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => (presetRequest.current = p)}
              className="rounded-md border border-border px-2.5 py-1 capitalize text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
            >
              {p === "top" ? "Top-down" : `${p} side`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

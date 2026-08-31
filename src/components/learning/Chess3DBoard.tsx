import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Chess } from "chess.js";

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

function Controls() {
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

  useFrame(() => controlsRef.current?.update());
  return null;
}

function Board({ highlight }: { highlight: { from: string; to: string } | null }) {
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

  return (
    <group>
      {squares.map((sq) => (
        <mesh key={sq.key} position={[sq.x, 0, sq.z]} receiveShadow material={sq.dark ? darkMat : lightMat}>
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
    </group>
  );
}

function PieceTop({
  type,
  y,
  material,
}: {
  type: PieceSymbol;
  y: number;
  material: THREE.MeshStandardMaterial;
}) {
  switch (type) {
    case "p":
      return (
        <mesh position={[0, y + 0.17, 0]} material={material} castShadow>
          <coneGeometry args={[0.2, 0.34, 16]} />
        </mesh>
      );
    case "r":
      return (
        <group>
          <mesh position={[0, y + 0.16, 0]} material={material} castShadow>
            <cylinderGeometry args={[0.26, 0.28, 0.32, 16]} />
          </mesh>
          <mesh position={[0, y + 0.36, 0]} material={material} castShadow>
            <cylinderGeometry args={[0.29, 0.29, 0.08, 8]} />
          </mesh>
        </group>
      );
    case "n":
      return (
        <mesh position={[0, y + 0.2, 0]} rotation={[0, 0.5, 0]} material={material} castShadow>
          <boxGeometry args={[0.24, 0.4, 0.34]} />
        </mesh>
      );
    case "b":
      return (
        <group>
          <mesh position={[0, y + 0.22, 0]} material={material} castShadow>
            <coneGeometry args={[0.19, 0.44, 16]} />
          </mesh>
          <mesh position={[0, y + 0.48, 0]} material={material} castShadow>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
        </group>
      );
    case "q":
      return (
        <group>
          <mesh position={[0, y + 0.27, 0]} material={material} castShadow>
            <coneGeometry args={[0.22, 0.54, 16]} />
          </mesh>
          <mesh position={[0, y + 0.6, 0]} material={material} castShadow>
            <sphereGeometry args={[0.13, 14, 14]} />
          </mesh>
        </group>
      );
    case "k":
      return (
        <group>
          <mesh position={[0, y + 0.28, 0]} material={material} castShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.56, 16]} />
          </mesh>
          <mesh position={[0, y + 0.62, 0]} material={material} castShadow>
            <boxGeometry args={[0.09, 0.18, 0.09]} />
          </mesh>
          <mesh position={[0, y + 0.6, 0]} material={material} castShadow>
            <boxGeometry args={[0.2, 0.06, 0.06]} />
          </mesh>
        </group>
      );
  }
}

function Piece({ square, type, color }: { square: string; type: PieceSymbol; color: Color }) {
  const [x, z] = squareToXZ(square);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: color === "w" ? "#f4ecd8" : "#2c2a28",
        roughness: 0.45,
        metalness: 0.05,
      }),
    [color],
  );
  const baseHeight = 0.12;
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, baseHeight / 2, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.27, 0.3, baseHeight, 16]} />
      </mesh>
      <PieceTop type={type} y={baseHeight} material={material} />
    </group>
  );
}

// A full chess set (board + pieces) as a single group other scenes — e.g.
// the tournament hall — can embed at any position/scale. Not wrapped in its
// own <Canvas>: <Canvas> elements can't nest, so anything placing this
// inside a bigger scene must already be inside one.
export function ChessSet({
  fen,
  orientation = "white",
  lastMove,
}: {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
}) {
  const board = useMemo(() => {
    try {
      const g = new Chess();
      g.load(fen);
      return g.board() as unknown as BoardSquare[][];
    } catch {
      return [] as BoardSquare[][];
    }
  }, [fen]);
  const pieces = useMemo(() => board.flat().filter((sq): sq is NonNullable<BoardSquare> => !!sq), [board]);

  return (
    <group rotation={[0, orientation === "black" ? Math.PI : 0, 0]}>
      <Board highlight={lastMove ?? null} />
      {pieces.map((p) => (
        <Piece key={p.square} square={p.square} type={p.type} color={p.color} />
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
}: {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
}) {
  // See the same nudge in TournamentHall3D — R3F's canvas-size
  // ResizeObserver can miss the container's first layout pass.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="aspect-square w-full max-w-[520px] mx-auto rounded-xl overflow-hidden border border-border bg-muted">
      <Canvas shadows camera={{ position: [0, 7.5, 7], fov: 42 }}>
        <color attach="background" args={["#1c1917"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 4]} intensity={1.1} castShadow />
        <ChessSet fen={fen} orientation={orientation} lastMove={lastMove} />
        <Controls />
      </Canvas>
    </div>
  );
}

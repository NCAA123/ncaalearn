import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ChessSet } from "@/components/learning/Chess3DBoard";

export type HallStep = {
  id: string;
  prompt: string;
  context: { fen?: string; incidentType?: string } | null;
};

const TABLE_SPACING = 5.5;

function tableX(index: number, total: number) {
  return index * TABLE_SPACING - ((total - 1) * TABLE_SPACING) / 2;
}

function Hall({ total }: { total: number }) {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5b4636", roughness: 0.95 }), []);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f2a26", roughness: 1 }), []);
  const width = Math.max(total * TABLE_SPACING + 6, 14);

  return (
    <group>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[width, 12]} />
      </mesh>
      <mesh position={[0, 3, -5]} material={wallMat} receiveShadow>
        <boxGeometry args={[width, 6, 0.3]} />
      </mesh>
      <mesh position={[-width / 2, 3, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <boxGeometry args={[12, 6, 0.3]} />
      </mesh>
      <mesh position={[width / 2, 3, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <boxGeometry args={[12, 6, 0.3]} />
      </mesh>
    </group>
  );
}

function FigurePair({ material }: { material: THREE.MeshStandardMaterial }) {
  // Abstract stand-in for a non-board incident (conduct, time forfeit, etc.)
  // — two simple capsule "people" rather than a chess set.
  return (
    <group>
      <mesh position={[-0.4, 0.55, 0]} material={material} castShadow>
        <capsuleGeometry args={[0.18, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[0.4, 0.55, 0]} material={material} castShadow>
        <capsuleGeometry args={[0.18, 0.5, 4, 8]} />
      </mesh>
    </group>
  );
}

function Table({
  index,
  total,
  step,
  state,
}: {
  index: number;
  total: number;
  step: HallStep;
  state: "done" | "active" | "pending";
}) {
  const x = tableX(index, total);
  const topMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: state === "active" ? "#3f342a" : "#332a22",
        roughness: 0.7,
      }),
    [state],
  );
  const legMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1f1a16", roughness: 0.8 }), []);
  const figureMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: state === "done" ? "#5c7a5c" : "#8a8377", roughness: 0.6 }),
    [state],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: state === "active" ? "#f5c451" : state === "done" ? "#4caf6a" : "#3a3530",
        emissive: state === "active" ? "#f5c451" : state === "done" ? "#4caf6a" : "#000000",
        emissiveIntensity: state === "active" ? 0.6 : 0.3,
      }),
    [state],
  );

  const hasBoard = !!step.context?.fen;

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[1.6, 1.85, 32]} />
      </mesh>
      <mesh position={[0, 0.75, 0]} material={topMat} castShadow>
        <boxGeometry args={[2.2, 0.1, 1.6]} />
      </mesh>
      {[
        [-1, 0, -0.7],
        [1, 0, -0.7],
        [-1, 0, 0.7],
        [1, 0, 0.7],
      ].map(([lx, , lz], i) => (
        <mesh key={i} position={[lx, 0.37, lz]} material={legMat}>
          <cylinderGeometry args={[0.06, 0.06, 0.75, 8]} />
        </mesh>
      ))}
      <group position={[0, 0.8, 0]} scale={hasBoard ? 0.32 : 1}>
        {hasBoard ? <ChessSet fen={step.context!.fen!} /> : <FigurePair material={figureMat} />}
      </group>
    </group>
  );
}

function CameraRig({ targetX }: { targetX: number }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(targetX, 3.4, 5.2));
  const lookAt = useRef(new THREE.Vector3(targetX, 0.8, 0));

  useEffect(() => {
    desired.current.set(targetX, 3.4, 5.2);
    lookAt.current.set(targetX, 0.8, 0);
  }, [targetX]);

  useFrame(() => {
    camera.position.lerp(desired.current, 0.06);
    camera.lookAt(lookAt.current);
  });

  return null;
}

// A stylised, walkable-in-spirit hall: the camera glides between numbered
// "stations" (tables) as the candidate progresses through a scenario's
// steps. No character model or WASD movement — the camera itself is the
// candidate's viewpoint, which keeps this a robust prototype rather than a
// full 3D game (no collision/physics to get wrong).
export function TournamentHall3D({
  steps,
  activeStepId,
  answeredStepIds,
}: {
  steps: HallStep[];
  activeStepId: string | null;
  answeredStepIds: string[];
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStepId),
  );
  const targetX = tableX(activeIndex, steps.length || 1);
  const answered = useMemo(() => new Set(answeredStepIds), [answeredStepIds]);

  // R3F's canvas-size ResizeObserver can miss the container's very first
  // layout pass when the container is sized via CSS aspect-ratio on a wide
  // box (observed: canvas stays at the browser-default 300x150 until
  // something dispatches a resize) — nudge it once after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-black">
      <Canvas shadows camera={{ position: [targetX, 3.4, 5.2], fov: 55 }}>
        <color attach="background" args={["#12100e"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 8, 3]} intensity={1} castShadow />
        <pointLight position={[targetX, 4, 2]} intensity={0.4} />
        <Hall total={steps.length || 1} />
        {steps.map((step, i) => (
          <Table
            key={step.id}
            index={i}
            total={steps.length}
            step={step}
            state={step.id === activeStepId ? "active" : answered.has(step.id) ? "done" : "pending"}
          />
        ))}
        <CameraRig targetX={targetX} />
      </Canvas>
    </div>
  );
}

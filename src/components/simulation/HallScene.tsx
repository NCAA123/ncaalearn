import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ChessSet } from "@/components/learning/Chess3DBoard";
import { tableX } from "@/lib/hall-layout";

const HALL_GLB = "/models/hall/hall.glb";
const TABLE_KIT_GLB = "/models/hall/table-kit.glb";

useGLTF.preload(HALL_GLB);
useGLTF.preload(TABLE_KIT_GLB);

function useClonedScene(url: string) {
  const { scene } = useGLTF(url);
  // GLTF scenes from useGLTF are cached/shared across instances -- clone
  // per usage so multiple tables (and hot re-renders) don't fight over the
  // same Object3D graph.
  return useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);
}

export function HallShell() {
  const shell = useClonedScene(HALL_GLB);
  return <primitive object={shell} />;
}

function FigurePair({ material }: { material: THREE.MeshStandardMaterial }) {
  // Abstract stand-in for a non-board incident (conduct, time forfeit, etc.)
  // -- two simple capsule "people" rather than a chess set.
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

export type TableTopContext = { fen?: string; incidentType?: string; incident?: { category: string } } | null;

export function TableInstance({
  index,
  total,
  context,
  state,
}: {
  index: number;
  total: number;
  context: TableTopContext;
  state: "done" | "active" | "pending";
}) {
  const kit = useClonedScene(TABLE_KIT_GLB);
  const x = tableX(index, total);
  const hasBoard = !!context?.fen;
  const hasIncident = !!context?.incident;

  const figureMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: state === "done" ? "#5c7a5c" : "#8a8377", roughness: 0.6 }),
    [state],
  );
  // Incident stations get a red/orange ring instead of the usual
  // yellow/grey so the hall visually flags "something's happening here"
  // distinctly from a normal quiz station -- still green once answered.
  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color:
          state === "done" ? "#4caf6a" : hasIncident ? (state === "active" ? "#e5484d" : "#7a2e2e") : state === "active" ? "#f5c451" : "#3a3530",
        emissive:
          state === "done" ? "#4caf6a" : hasIncident ? (state === "active" ? "#e5484d" : "#000000") : state === "active" ? "#f5c451" : "#000000",
        emissiveIntensity: state === "active" ? 0.6 : 0.3,
      }),
    [state, hasIncident],
  );

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[1.6, 1.85, 32]} />
      </mesh>
      <primitive object={kit} />
      <group position={[0, 0.8, 0]} scale={hasBoard ? 0.32 : 1}>
        {hasBoard ? <ChessSet fen={context!.fen!} /> : <FigurePair material={figureMat} />}
      </group>
    </group>
  );
}

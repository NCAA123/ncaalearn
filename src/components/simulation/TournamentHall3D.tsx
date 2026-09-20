import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HallShell, TableInstance } from "@/components/simulation/HallScene";
import { HallWalkControls } from "@/components/simulation/HallWalkControls";
import { tableX } from "@/lib/hall-layout";
import { useHallQualityTier } from "@/hooks/useHallQualityTier";

const DPR_BY_TIER = { low: 1, medium: 1, high: [1, 2] as [number, number] };

export type HallStep = {
  id: string;
  prompt: string;
  context: { fen?: string; incidentType?: string } | null;
};

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

// "tour" (default): the camera glides between numbered "stations" (tables)
// as the candidate progresses through a scenario's steps -- reliable for a
// graded walkthrough since the camera always reaches every step. "walk":
// free first-person WASD movement with collision against the hall's walls
// and columns (Phase 3), used by /dev/hall's QA toggle -- not wired into
// the scenario flow since a candidate wandering off mid-exam is undesirable.
export function TournamentHall3D({
  steps,
  activeStepId,
  answeredStepIds,
  mode = "tour",
}: {
  steps: HallStep[];
  activeStepId: string | null;
  answeredStepIds: string[];
  mode?: "tour" | "walk";
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStepId),
  );
  const targetX = tableX(activeIndex, steps.length || 1);
  const answered = useMemo(() => new Set(answeredStepIds), [answeredStepIds]);
  const qualityTier = useHallQualityTier();
  const shadowsEnabled = qualityTier !== "low";

  // R3F's canvas-size ResizeObserver can miss the container's very first
  // layout pass when the container is sized via CSS aspect-ratio on a wide
  // box (observed: canvas stays at the browser-default 300x150 until
  // something dispatches a resize) -- nudge it once after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-black">
      <Canvas shadows={shadowsEnabled} dpr={DPR_BY_TIER[qualityTier]} camera={{ position: [targetX, 3.4, 5.2], fov: 55 }}>
        <color attach="background" args={["#12100e"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 8, 3]} intensity={1} castShadow={shadowsEnabled} />
        <pointLight position={[targetX, 4, 2]} intensity={0.4} />
        <HallShell />
        {steps.map((step, i) => (
          <TableInstance
            key={step.id}
            index={i}
            total={steps.length}
            context={step.context}
            state={step.id === activeStepId ? "active" : answered.has(step.id) ? "done" : "pending"}
          />
        ))}
        {mode === "walk" ? <HallWalkControls startX={targetX} /> : <CameraRig targetX={targetX} />}
      </Canvas>
    </div>
  );
}

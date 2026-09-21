import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { HallShell, TableInstance } from "@/components/simulation/HallScene";
import { HallWalkControls, type WalkApi } from "@/components/simulation/HallWalkControls";
import { HallTouchControls, createTouchControlState } from "@/components/simulation/HallTouchControls";
import { ArbiterPatrol } from "@/components/simulation/CharacterRig";
import { tableX, HALL_LENGTH } from "@/lib/hall-layout";
import { useHallQualityTier } from "@/hooks/useHallQualityTier";
import { Button } from "@/components/ui/button";

const DPR_BY_TIER = { low: 1, medium: 1, high: [1, 2] as [number, number] };

export type HallStep = {
  id: string;
  prompt: string;
  context: { fen?: string; incidentType?: string; incident?: { category: string } } | null;
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

// N8AO (ambient occlusion) + a light bloom pass tuned for the ceiling's
// emissive light panels + ACES filmic tone mapping + SMAA. Skipped
// entirely on "low" quality tier -- per the brief's own perf budget,
// low-tier devices get no post-processing at all, not a cheaper version
// of it.
function HallPostFX({ tier }: { tier: "low" | "medium" | "high" }) {
  if (tier === "low") return null;
  return (
    <EffectComposer multisampling={tier === "high" ? 4 : 0}>
      <N8AO aoRadius={1.2} intensity={tier === "high" ? 1.5 : 1} quality={tier === "high" ? "high" : "medium"} />
      <Bloom intensity={0.4} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
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
  onInteractStep,
}: {
  steps: HallStep[];
  activeStepId: string | null;
  answeredStepIds: string[];
  mode?: "tour" | "walk";
  onInteractStep?: (stepId: string) => void;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStepId),
  );
  const targetX = tableX(activeIndex, steps.length || 1);
  const answered = useMemo(() => new Set(answeredStepIds), [answeredStepIds]);
  const qualityTier = useHallQualityTier();
  const shadowsEnabled = qualityTier !== "low";
  const [walkApi, setWalkApi] = useState<WalkApi | null>(null);
  const touchState = useRef(createTouchControlState()).current;

  const interactableTables = useMemo(
    () => steps.map((step, i) => ({ stepId: step.id, x: tableX(i, steps.length || 1), z: 0 })),
    [steps],
  );

  // Patrol path clamped to the hall's real footprint, independent of
  // wherever tableX() happens to place the row's own ends (see NOTES.md --
  // that spacing has no awareness of the room's fixed 30m length).
  const patrolHalfSpan = HALL_LENGTH / 2 - 2;
  const rawMinX = tableX(0, steps.length || 1);
  const rawMaxX = tableX((steps.length || 1) - 1, steps.length || 1);
  const patrolMinX = Math.max(-patrolHalfSpan, Math.min(rawMinX, rawMaxX));
  const patrolMaxX = Math.min(patrolHalfSpan, Math.max(rawMinX, rawMaxX));

  // R3F's canvas-size ResizeObserver can miss the container's very first
  // layout pass when the container is sized via CSS aspect-ratio on a wide
  // box (observed: canvas stays at the browser-default 300x150 until
  // something dispatches a resize) -- nudge it once after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div>
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-black">
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
          {patrolMinX < patrolMaxX && <ArbiterPatrol pathMinX={patrolMinX} pathMaxX={patrolMaxX} />}
          {mode === "walk" ? (
            <HallWalkControls
              startX={targetX}
              tables={interactableTables}
              onInteract={onInteractStep}
              onReady={setWalkApi}
              touchState={touchState}
            />
          ) : (
            <CameraRig targetX={targetX} />
          )}
          <HallPostFX tier={qualityTier} />
        </Canvas>
        {/* Mobile dual-zone controls (Phase 3's own explicit ask): left-half
            drag is a virtual joystick, right-half drag looks around. Purely
            additive over the DOM -- desktop WASD/pointer-lock inside the
            Canvas is untouched, both write into the same shared ref. */}
        {mode === "walk" && <HallTouchControls state={touchState} />}
      </div>
      {mode === "walk" && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2">
          {steps.map((step, i) => (
            <Button
              key={step.id}
              type="button"
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => walkApi?.walkTo(tableX(i, steps.length || 1), 0)}
            >
              Walk to station {i + 1}
            </Button>
          ))}
        </div>
      )}
      {patrolMinX < patrolMaxX && (
        <p className="text-[10px] text-muted-foreground/70 px-2 py-1 text-right">
          Arbiter figure: "CesiumMan" by Cesium, CC BY 4.0
        </p>
      )}
    </div>
  );
}

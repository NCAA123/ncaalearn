import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PointerLockControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { HALL_LENGTH, HALL_WIDTH, COLUMNS, COLUMN_RADIUS } from "@/lib/hall-layout";

const WALK_SPEED = 3.2; // m/s, roughly a brisk walk
const AUTO_WALK_SPEED = 2.6; // slightly slower for click-to-walk, reads as deliberate
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.7;
const WALL_MARGIN = 0.5;
const INTERACT_RADIUS = 2.6;
const ARRIVE_EPSILON = 0.12;

// [right, forward] axis contribution for each key -- kept separate from
// world-space X/Z so movement is always relative to where the camera is
// currently looking, not the room's fixed axes.
const KEY_MAP: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

// Clamps a candidate XZ position to the room's floor bounds, then pushes it
// back out of any column it would otherwise walk inside. Cheap circle/AABB
// math rather than a full physics engine (three-mesh-bvh) -- the hall's
// only static obstacles are 8 columns plus the outer walls, so this is
// enough without pulling in a collision library for Phase 3's first pass.
function resolveCollisions(x: number, z: number): [number, number] {
  const halfL = HALL_LENGTH / 2 - WALL_MARGIN;
  const halfW = HALL_WIDTH / 2 - WALL_MARGIN;
  let cx = Math.min(halfL, Math.max(-halfL, x));
  let cz = Math.min(halfW, Math.max(-halfW, z));

  for (const [colX, colY] of COLUMNS) {
    const dx = cx - colX;
    const dz = cz - colY;
    const dist = Math.hypot(dx, dz);
    const minDist = COLUMN_RADIUS + PLAYER_RADIUS;
    if (dist > 0.0001 && dist < minDist) {
      const push = minDist - dist;
      cx += (dx / dist) * push;
      cz += (dz / dist) * push;
    }
  }
  return [cx, cz];
}

export type InteractableTable = { stepId: string; x: number; z: number };

// Invisible floor plane used purely to catch clicks/taps for click-to-walk
// -- the accessibility fallback the brief calls for ("click or tap a board
// or a person to walk there automatically"), independent of WASD/pointer
// lock. Sits at y=0.01 so it doesn't z-fight the real floor mesh from
// hall.glb.
function ClickToWalkFloor({ onPick }: { onPick: (x: number, z: number) => void }) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPick(e.point.x, e.point.z);
  };
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} visible={false}>
      <planeGeometry args={[HALL_LENGTH, HALL_WIDTH]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Free first-person walking: WASD/arrows to move, drag to look (via drei's
// PointerLockControls), or click/tap the floor to auto-walk there (the
// brief's own accessibility fallback -- works without pointer lock, and
// the /dev/hall page additionally exposes "Board N" buttons that call the
// same walkTo path for fully keyboard-operable navigation). Used by
// TournamentHall3D's "walk" mode; the guided "tour" mode keeps the
// original camera-glide-between-stations behavior.
export type WalkApi = { walkTo: (x: number, z: number) => void };

export function HallWalkControls({
  startX,
  tables = [],
  onInteract,
  onReady,
}: {
  startX: number;
  tables?: InteractableTable[];
  onInteract?: (stepId: string) => void;
  onReady?: (api: WalkApi) => void;
}) {
  const { camera } = useThree();
  const pressed = useRef<Set<string>>(new Set());
  const walkTarget = useRef<{ x: number; z: number } | null>(null);
  const [nearestStepId, setNearestStepId] = useState<string | null>(null);
  const [promptPos, setPromptPos] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    // Clamp the spawn point too, not just movement deltas -- startX comes
    // from the same tableX() spacing the guided tour uses, which spaces
    // tables evenly with no awareness of the hall shell's fixed 30x20m
    // footprint. For a table count wide enough to exceed that footprint
    // (the /dev/hall QA page's demo layout did, at 8 tables), an
    // unclamped spawn placed the camera outside the walls entirely.
    const [cx, cz] = resolveCollisions(startX, 6);
    camera.position.set(cx, EYE_HEIGHT, cz);
    camera.lookAt(cx, EYE_HEIGHT, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      pressed.current.add(e.code);
      if (e.code === "KeyE" && nearestStepId && onInteract) onInteract(nearestStepId);
    };
    const onUp = (e: KeyboardEvent) => pressed.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [nearestStepId, onInteract]);

  // Exposes walkTo so parent components (e.g. a keyboard-operable
  // "Board N" button list rendered outside the Canvas) can trigger the
  // exact same click-to-walk path without needing a real pointer event.
  useEffect(() => {
    onReady?.({
      walkTo: (x, z) => {
        const [cx, cz] = resolveCollisions(x, z);
        walkTarget.current = { x: cx, z: cz };
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    let moveRight = 0;
    let moveForward = 0;
    for (const code of pressed.current) {
      const axis = KEY_MAP[code];
      if (axis) {
        moveRight += axis[0];
        moveForward += axis[1];
      }
    }

    if (moveRight !== 0 || moveForward !== 0) {
      // Manual movement cancels any pending auto-walk.
      walkTarget.current = null;
      const len = Math.hypot(moveRight, moveForward) || 1;
      moveRight /= len;
      moveForward /= len;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

      const step = WALK_SPEED * delta;
      const dx = (right.x * moveRight + forward.x * moveForward) * step;
      const dz = (right.z * moveRight + forward.z * moveForward) * step;

      const [cx, cz] = resolveCollisions(camera.position.x + dx, camera.position.z + dz);
      camera.position.x = cx;
      camera.position.z = cz;
      camera.position.y = EYE_HEIGHT;
    } else if (walkTarget.current) {
      const { x: tx, z: tz } = walkTarget.current;
      const dx = tx - camera.position.x;
      const dz = tz - camera.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < ARRIVE_EPSILON) {
        walkTarget.current = null;
      } else {
        const step = Math.min(AUTO_WALK_SPEED * delta, dist);
        const [cx, cz] = resolveCollisions(camera.position.x + (dx / dist) * step, camera.position.z + (dz / dist) * step);
        camera.position.x = cx;
        camera.position.y = EYE_HEIGHT;
        camera.position.z = cz;
        camera.lookAt(tx, EYE_HEIGHT, tz);
      }
    }

    if (tables.length > 0) {
      let nearest: InteractableTable | null = null;
      let nearestDist = Infinity;
      for (const t of tables) {
        const d = Math.hypot(t.x - camera.position.x, t.z - camera.position.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = t;
        }
      }
      if (nearest && nearestDist <= INTERACT_RADIUS) {
        setNearestStepId(nearest.stepId);
        setPromptPos([nearest.x, 1.6, nearest.z]);
      } else {
        setNearestStepId((prev) => (prev === null ? prev : null));
        setPromptPos((prev) => (prev === null ? prev : null));
      }
    }
  });

  return (
    <>
      <PointerLockControls />
      <ClickToWalkFloor
        onPick={(x, z) => {
          const [cx, cz] = resolveCollisions(x, z);
          walkTarget.current = { x: cx, z: cz };
        }}
      />
      {promptPos && nearestStepId && (
        <Html position={promptPos} center distanceFactor={8} occlude={false}>
          <button
            type="button"
            onClick={() => onInteract?.(nearestStepId)}
            className="pointer-events-auto rounded-full bg-black/80 text-white text-xs px-3 py-1.5 border border-white/30 whitespace-nowrap"
          >
            Press E to inspect
          </button>
        </Html>
      )}
    </>
  );
}

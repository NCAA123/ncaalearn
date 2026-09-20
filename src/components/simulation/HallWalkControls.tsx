import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { HALL_LENGTH, HALL_WIDTH, COLUMNS, COLUMN_RADIUS } from "@/lib/hall-layout";

const WALK_SPEED = 3.2; // m/s, roughly a brisk walk
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.7;
const WALL_MARGIN = 0.5;

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

// Free first-person walking: WASD/arrows to move, drag to look (via drei's
// PointerLockControls). Used by /dev/hall's "Free walk" mode -- the guided
// scenario flow (TournamentHall3D's default "tour" mode) keeps the existing
// camera-glide-between-stations behavior, since a graded walkthrough needs
// the camera to reliably reach every step, not wander off.
export function HallWalkControls({ startX }: { startX: number }) {
  const { camera } = useThree();
  const pressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    camera.position.set(startX, EYE_HEIGHT, 6);
    camera.lookAt(startX, EYE_HEIGHT, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => pressed.current.add(e.code);
    const onUp = (e: KeyboardEvent) => pressed.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
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
    if (moveRight === 0 && moveForward === 0) return;
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
  });

  return <PointerLockControls />;
}

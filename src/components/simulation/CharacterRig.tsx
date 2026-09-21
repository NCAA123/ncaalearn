import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const CHARACTER_GLB = "/models/characters/cesium-man.glb";
useGLTF.preload(CHARACTER_GLB);

// A real skinned/animated humanoid (Phase 4's first pass) -- see ASSETS.md
// for source/license. Plain Object3D.clone() breaks a SkinnedMesh's bone
// bindings when more than one instance shares the same source scene, so
// every clone goes through three-stdlib's SkeletonUtils.clone() instead
// (the standard three.js pattern for cloning skinned/animated GLTFs).
function useClonedCharacter() {
  const gltf = useGLTF(CHARACTER_GLB);
  return useMemo(() => {
    const scene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return { scene, animations: gltf.animations };
  }, [gltf.scene, gltf.animations]);
}

// A single arbiter figure patrolling back and forth along the hall's table
// row -- proves real skeletal animation works in this stack. Seated
// "players" at each table remain the placeholder capsules (HallScene.tsx's
// FigurePair) pending a dedicated seated-pose asset; modeling/sourcing a
// full cast (players, spectators, distinct arbiter poses) is future work,
// not this pass's scope.
export function ArbiterPatrol({
  pathMinX,
  pathMaxX,
  z = 2.5,
  reducedMotion = false,
}: {
  pathMinX: number;
  pathMaxX: number;
  z?: number;
  reducedMotion?: boolean;
}) {
  const { scene, animations } = useClonedCharacter();
  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  const t = useRef(0);

  useEffect(() => {
    const first = animations[0]?.name;
    // Continuous back-and-forth walking is exactly the kind of motion
    // prefers-reduced-motion asks pages to avoid -- freeze at a static
    // standing pose (mid-path, first animation frame) instead of playing
    // the walk cycle on a loop.
    if (first && actions[first] && !reducedMotion) {
      actions[first].reset().play();
    }
    return () => {
      mixer.stopAllAction();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, reducedMotion]);

  const span = Math.max(pathMaxX - pathMinX, 0.001);
  const cycleSeconds = 12; // one full back-and-forth walk

  useFrame((_, delta) => {
    if (!group.current) return;
    if (reducedMotion) {
      group.current.position.set(pathMinX + span / 2, 0, z);
      group.current.rotation.y = Math.PI / 2;
      return;
    }
    t.current = (t.current + delta / cycleSeconds) % 1;
    // Triangle wave 0->1->0 across the path so the figure walks, turns,
    // and walks back rather than teleporting at the ends.
    const phase = t.current < 0.5 ? t.current * 2 : 2 - t.current * 2;
    const x = pathMinX + span * phase;
    const facingForward = t.current < 0.5;

    group.current.position.set(x, 0, z);
    group.current.rotation.y = facingForward ? Math.PI / 2 : -Math.PI / 2;
  });

  // CesiumMan's bind-pose bbox is ~1.51m tall -- scale up to a ~1.73m adult.
  return <primitive ref={group} object={scene} scale={1.15} />;
}

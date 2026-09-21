import { useRef, useState, useEffect } from "react";

// Shared, frame-polled input state written by this DOM overlay (rendered
// OUTSIDE the R3F <Canvas>, as a sibling) and read every frame by
// HallWalkControls (rendered INSIDE the Canvas). A plain mutable ref is the
// simplest bridge across that boundary -- no context/store needed for
// something polled once per frame and never rendered from.
export type TouchControlState = {
  move: { x: number; z: number } | null; // normalized [-1,1] joystick vector
  lookDeltaX: number; // accumulated since last frame-read, consumed+reset by the reader
  lookDeltaY: number;
};

export function createTouchControlState(): TouchControlState {
  return { move: null, lookDeltaX: 0, lookDeltaY: 0 };
}

const JOYSTICK_RADIUS = 44;
const LOOK_SENSITIVITY = 0.006;

// Classic dual-zone mobile FPS scheme: a movement joystick anchored to
// wherever the left half of the overlay is first touched, and drag-to-look
// anywhere on the right half. Desktop WASD/pointer-lock (HallWalkControls)
// keeps working untouched -- this is purely additive, and both write into
// the same shared state so the walk logic doesn't need to know which
// input method produced it.
export function HallTouchControls({ state }: { state: TouchControlState }) {
  // Only rendered on touch-primary devices -- this overlay sits on top of
  // the Canvas and would otherwise swallow the mouse events desktop's
  // pointer-lock/click-to-walk (inside HallWalkControls) depends on. A
  // coarse-pointer/no-hover device is the standard signal for "touch is
  // the primary input," not just "supports touch" (a touch laptop with a
  // mouse still reports fine/hover).
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const knobRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const joystickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lastLook = useRef<{ x: number; y: number } | null>(null);

  function resetKnob() {
    if (knobRef.current) knobRef.current.style.transform = "translate(-50%, -50%)";
    if (baseRef.current) baseRef.current.style.opacity = "0";
  }

  function handleStart(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    if (isLeftHalf && joystickTouchId.current === null) {
      joystickTouchId.current = e.pointerId;
      joystickOrigin.current = { x: e.clientX, y: e.clientY };
      if (baseRef.current) {
        baseRef.current.style.left = `${e.clientX}px`;
        baseRef.current.style.top = `${e.clientY}px`;
        baseRef.current.style.opacity = "1";
      }
    } else if (!isLeftHalf && lookTouchId.current === null) {
      lookTouchId.current = e.pointerId;
      lastLook.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId === joystickTouchId.current && joystickOrigin.current) {
      const dx = e.clientX - joystickOrigin.current.x;
      const dy = e.clientY - joystickOrigin.current.y;
      const dist = Math.min(Math.hypot(dx, dy), JOYSTICK_RADIUS);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * dist;
      const ky = Math.sin(angle) * dist;
      if (knobRef.current) knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      // Screen down (+y) = move backward (negative forward); screen right = strafe right.
      state.move = { x: kx / JOYSTICK_RADIUS, z: -ky / JOYSTICK_RADIUS };
    } else if (e.pointerId === lookTouchId.current && lastLook.current) {
      state.lookDeltaX += (e.clientX - lastLook.current.x) * LOOK_SENSITIVITY;
      state.lookDeltaY += (e.clientY - lastLook.current.y) * LOOK_SENSITIVITY;
      lastLook.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId === joystickTouchId.current) {
      joystickTouchId.current = null;
      joystickOrigin.current = null;
      state.move = null;
      resetKnob();
    } else if (e.pointerId === lookTouchId.current) {
      lookTouchId.current = null;
      lastLook.current = null;
    }
  }

  if (!isTouchDevice) return null;

  return (
    <div
      className="absolute inset-0 touch-none"
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
    >
      <div
        ref={baseRef}
        className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 opacity-0 transition-opacity"
      >
        <div ref={knobRef} className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-white/60">Drag: move</p>
      <p className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-white/60">Drag: look</p>
    </div>
  );
}

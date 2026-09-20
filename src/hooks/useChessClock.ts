import { useCallback, useEffect, useRef, useState } from "react";
import { completeMove, createClockState, pause, reset, start, tick, type ClockState, type TimeControl } from "@/lib/chess-clock";

// Ticks a ClockState against real elapsed time via requestAnimationFrame
// (delta-based, so it doesn't drift under tab-throttling the way a naive
// setInterval(…, 1000) would). The clock model itself (src/lib/chess-clock.ts)
// stays framework-agnostic; this hook is just the React wiring around it.
export function useChessClock(timeControl: TimeControl) {
  const [state, setState] = useState<ClockState>(() => createClockState(timeControl));
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function frame(now: number) {
      if (lastFrameRef.current !== null) {
        const delta = now - lastFrameRef.current;
        setState((s) => tick(s, delta));
      }
      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
    };
  }, []);

  return {
    state,
    start: useCallback(() => setState((s) => start(s)), []),
    pause: useCallback(() => setState((s) => pause(s)), []),
    completeMove: useCallback(() => setState((s) => completeMove(s)), []),
    reset: useCallback((tc?: TimeControl) => setState((s) => reset(s, tc)), []),
  };
}

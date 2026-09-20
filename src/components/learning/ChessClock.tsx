import { Flag } from "lucide-react";
import { formatClock, type ClockState } from "@/lib/chess-clock";
import { cn } from "@/lib/utils";

// Purely presentational -- takes a ClockState (see src/lib/chess-clock.ts /
// useChessClock) and renders it. No timing logic lives here, so the hall,
// an exercise, or a future physical-clock 3D model can all drive the same
// state shape without depending on React at all for the ticking itself.
export function ChessClock({ state }: { state: ClockState }) {
  const whiteActive = state.running && state.turn === "w" && !state.flagged;
  const blackActive = state.running && state.turn === "b" && !state.flagged;

  return (
    <div className="flex gap-3">
      <ClockFace label="White" ms={state.whiteMs} active={whiteActive} flagged={state.flagged === "w"} />
      <ClockFace label="Black" ms={state.blackMs} active={blackActive} flagged={state.flagged === "b"} dark />
    </div>
  );
}

function ClockFace({
  label,
  ms,
  active,
  flagged,
  dark = false,
}: {
  label: string;
  ms: number;
  active: boolean;
  flagged: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border px-4 py-3 font-mono transition-colors",
        flagged
          ? "border-destructive bg-destructive/10"
          : active
            ? "border-primary bg-primary/10"
            : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
        <span>{label}</span>
        {flagged && <Flag className="h-3.5 w-3.5 text-destructive" aria-label="Flag fallen" />}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl tabular-nums",
          flagged ? "text-destructive" : active ? "text-foreground" : "text-muted-foreground",
          dark && !flagged && !active && "text-foreground/70",
        )}
      >
        {flagged ? "0:00" : formatClock(ms)}
      </div>
    </div>
  );
}

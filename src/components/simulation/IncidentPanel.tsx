import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveBoard } from "@/components/learning/InteractiveBoard";
import { formatClock } from "@/lib/chess-clock";
import { submitIncidentResponse } from "@/lib/incident.functions";
import type { Incident } from "@/lib/incidents";

const CATEGORY_LABEL: Record<Incident["category"], string> = {
  touch_move_dispute: "Touch-move dispute",
  clock_dispute: "Clock dispute",
  conduct_disturbance: "Conduct disturbance",
  scoresheet_discrepancy: "Scoresheet discrepancy",
  spectator_interference: "Spectator interference",
  electronic_device: "Electronic device",
};

// Renders a scripted hall incident: narrative, optional board/clock
// context, and response options. Every response is recorded as
// needs-review, never graded correct/incorrect -- an incident is a
// judgment call, not a mechanically gradable puzzle (see incidents.ts).
export function IncidentPanel({ incident, stepId, onDone }: { incident: Incident; stepId: string; onDone: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startedAt = useRef(Date.now());

  const submitFn = useServerFn(submitIncidentResponse);
  const submit = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a response first");
      return submitFn({ data: { stepId, optionId: selected, startedAt: startedAt.current } });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            {CATEGORY_LABEL[incident.category]}
          </p>
          <p className="text-sm font-medium text-foreground">{incident.title}</p>
        </div>
      </div>

      <p className="text-sm text-foreground leading-relaxed">{incident.narrative}</p>

      {incident.fen && (
        <div className="max-w-xs">
          <InteractiveBoard initialFen={incident.fen} disabled />
        </div>
      )}

      {(incident.whiteSeconds !== undefined || incident.blackSeconds !== undefined) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {incident.whiteSeconds !== undefined && <span>White clock: {formatClock(incident.whiteSeconds * 1000)}</span>}
          {incident.blackSeconds !== undefined && <span>Black clock: {formatClock(incident.blackSeconds * 1000)}</span>}
        </div>
      )}

      <div className="grid gap-2">
        {incident.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={submitted}
            onClick={() => setSelected(opt.id)}
            className={
              "text-left text-sm rounded-lg border px-3 py-2 transition " +
              (submitted && selected === opt.id
                ? "border-primary bg-primary/10"
                : selected === opt.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/40")
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {incident.articleRefs && incident.articleRefs.length > 0 && (
        <p className="text-[11px] text-muted-foreground italic">
          Reference points for chief-arbiter review (draft, not yet verified): {incident.articleRefs.join("; ")}
        </p>
      )}

      {submitted ? (
        <>
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border px-3 py-2">
            Response recorded for chief-arbiter review. Incident judgment calls aren't auto-graded.
          </p>
          <div className="flex justify-end">
            <Button onClick={onDone}>Next station</Button>
          </div>
        </>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => submit.mutate()} disabled={!selected || submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit response"}
          </Button>
        </div>
      )}
    </div>
  );
}

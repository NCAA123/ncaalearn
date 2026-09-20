import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Incident, IncidentResult } from "@/lib/incidents";

async function loadIncident(stepId: string): Promise<Incident> {
  const { data, error } = await supabaseAdmin
    .from("academy_scenario_steps")
    .select("context")
    .eq("id", stepId)
    .single();
  if (error) throw new Error(error.message);
  const incident = (data.context as { incident?: Incident } | null)?.incident;
  if (!incident) throw new Error("This step has no incident attached");
  return incident;
}

// Mirrors board-exercise.functions.ts's submitReviewExercise: an incident
// response is a judgment call, never mechanically gradable, so this just
// validates the chosen option is real and hands back a needs-review
// result -- no verdict, no DB write, nothing solution-shaped involved.
export const submitIncidentResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { stepId: string; optionId: string; startedAt: number }) =>
      z.object({ stepId: z.string().uuid(), optionId: z.string().min(1).max(80), startedAt: z.number() }).parse(d),
  )
  .handler(async ({ data }) => {
    const incident = await loadIncident(data.stepId);
    if (!incident.options.some((o) => o.id === data.optionId)) {
      throw new Error("Not a valid response option for this incident");
    }
    const result: IncidentResult = {
      needsReview: true,
      submittedOptionId: data.optionId,
      timeTakenMs: Date.now() - data.startedAt,
    };
    return result;
  });

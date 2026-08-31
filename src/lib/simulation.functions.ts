import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => ["academy_admin", "super_admin"].includes(r))) {
    throw new Error("Admin required");
  }
}

type Choice = { id: string; label: string; is_correct: boolean; points: number; feedback?: string };
type StepContext = { fen?: string; incidentType?: string } | null;
type StepRow = {
  id: string;
  scenario_id: string;
  step_order: number;
  prompt: string;
  context: StepContext;
  choices: Choice[];
  points: number;
};
type AnswerLogEntry = { step_id: string; choice_id: string; points: number; correct: boolean };

// ── Candidate: browse + play ─────────────────────────────────────────

export const listPublishedScenarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_scenarios")
      .select("id,title,slug,description,category,difficulty,estimated_minutes,passing_score")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const scenarios = data ?? [];
    const ids = scenarios.map((s) => s.id);
    const { data: steps } = ids.length
      ? await context.supabase.from("academy_scenario_steps").select("scenario_id").in("scenario_id", ids)
      : { data: [] as { scenario_id: string }[] };
    const stepCounts = new Map<string, number>();
    (steps ?? []).forEach((s) => stepCounts.set(s.scenario_id, (stepCounts.get(s.scenario_id) ?? 0) + 1));
    return scenarios.map((s) => ({ ...s, stepCount: stepCounts.get(s.id) ?? 0 }));
  });

// Strips is_correct/points/feedback from every choice — only the prompt,
// context (FEN etc. for rendering), and pickable labels reach the client
// before an answer is submitted. Mirrors the same fix already applied to
// lesson quizzes in quiz.functions.ts.
export const getScenarioForPlay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenarioId: string }) => z.object({ scenarioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: scenario, error: scenarioError }, { data: steps, error: stepsError }] = await Promise.all([
      context.supabase
        .from("academy_scenarios")
        .select("id,title,description,category,difficulty,passing_score")
        .eq("id", data.scenarioId)
        .single(),
      context.supabase
        .from("academy_scenario_steps")
        .select("id,step_order,prompt,context,choices")
        .eq("scenario_id", data.scenarioId)
        .order("step_order", { ascending: true }),
    ]);
    if (scenarioError) throw new Error(scenarioError.message);
    if (stepsError) throw new Error(stepsError.message);

    return {
      scenario,
      steps: ((steps ?? []) as unknown as StepRow[]).map((s) => ({
        id: s.id,
        step_order: s.step_order,
        prompt: s.prompt,
        context: s.context,
        choices: s.choices.map((c) => ({ id: c.id, label: c.label })),
      })),
    };
  });

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenarioId: string }) => z.object({ scenarioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("academy_simulation_attempts")
      .select("id,answers")
      .eq("scenario_id", data.scenarioId)
      .eq("user_id", context.userId)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { attemptId: existing.id, answeredStepIds: (existing.answers as AnswerLogEntry[]).map((a) => a.step_id) };
    }
    const { data: created, error } = await context.supabase
      .from("academy_simulation_attempts")
      .insert({ scenario_id: data.scenarioId, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { attemptId: created.id, answeredStepIds: [] as string[] };
  });

export const submitStepAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { attemptId: string; stepId: string; choiceId: string }) =>
      z
        .object({
          attemptId: z.string().uuid(),
          stepId: z.string().uuid(),
          choiceId: z.string().min(1).max(80),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt, error: attemptError } = await context.supabase
      .from("academy_simulation_attempts")
      .select("id,user_id,completed_at,answers")
      .eq("id", data.attemptId)
      .single();
    if (attemptError) throw new Error(attemptError.message);
    if (attempt.user_id !== context.userId) throw new Error("Not your attempt");
    if (attempt.completed_at) throw new Error("This attempt is already complete");

    const { data: step, error: stepError } = await supabaseAdmin
      .from("academy_scenario_steps")
      .select("id,choices")
      .eq("id", data.stepId)
      .single();
    if (stepError) throw new Error(stepError.message);

    const choices = step.choices as unknown as Choice[];
    const chosen = choices.find((c) => c.id === data.choiceId);
    if (!chosen) throw new Error("Invalid choice");

    const entry: AnswerLogEntry = {
      step_id: data.stepId,
      choice_id: data.choiceId,
      points: chosen.is_correct ? chosen.points : 0,
      correct: chosen.is_correct,
    };
    const answers = [
      ...((attempt.answers as AnswerLogEntry[]) ?? []).filter((a) => a.step_id !== data.stepId),
      entry,
    ];

    const { error: updateError } = await context.supabase
      .from("academy_simulation_attempts")
      .update({ answers })
      .eq("id", data.attemptId);
    if (updateError) throw new Error(updateError.message);

    const correctChoice = choices.find((c) => c.is_correct);
    return {
      isCorrect: chosen.is_correct,
      pointsAwarded: entry.points,
      feedback: chosen.feedback ?? null,
      correctChoiceId: correctChoice?.id ?? null,
    };
  });

export const completeAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: attempt, error: attemptError } = await context.supabase
      .from("academy_simulation_attempts")
      .select("id,user_id,scenario_id,answers")
      .eq("id", data.attemptId)
      .single();
    if (attemptError) throw new Error(attemptError.message);
    if (attempt.user_id !== context.userId) throw new Error("Not your attempt");

    const [{ data: scenario, error: scenarioError }, { data: steps, error: stepsError }] = await Promise.all([
      supabaseAdmin
        .from("academy_scenarios")
        .select("passing_score")
        .eq("id", attempt.scenario_id)
        .single(),
      supabaseAdmin.from("academy_scenario_steps").select("id,points").eq("scenario_id", attempt.scenario_id),
    ]);
    if (scenarioError) throw new Error(scenarioError.message);
    if (stepsError) throw new Error(stepsError.message);

    const answers = (attempt.answers as AnswerLogEntry[]) ?? [];
    const maxScore = (steps ?? []).reduce((s, st) => s + st.points, 0);
    const score = answers.reduce((s, a) => s + a.points, 0);
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = pct >= scenario.passing_score;

    const { error: updateError } = await context.supabase
      .from("academy_simulation_attempts")
      .update({ completed_at: new Date().toISOString(), score, max_score: maxScore, passed })
      .eq("id", data.attemptId);
    if (updateError) throw new Error(updateError.message);

    return { score, maxScore, percentage: pct, passed };
  });

export const listMyAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_simulation_attempts")
      .select("id,scenario_id,started_at,completed_at,score,max_score,passed,academy_scenarios(title)")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Admin authoring ──────────────────────────────────────────────────

export const listAllScenariosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("academy_scenarios")
      .select("id,title,slug,category,difficulty,is_published,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((s) => s.id);
    const { data: steps } = ids.length
      ? await supabaseAdmin.from("academy_scenario_steps").select("scenario_id").in("scenario_id", ids)
      : { data: [] as { scenario_id: string }[] };
    const stepCounts = new Map<string, number>();
    (steps ?? []).forEach((s) => stepCounts.set(s.scenario_id, (stepCounts.get(s.scenario_id) ?? 0) + 1));
    return (data ?? []).map((s) => ({ ...s, stepCount: stepCounts.get(s.id) ?? 0 }));
  });

export const createScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      title: string;
      slug: string;
      description?: string;
      category?: string;
      difficulty?: string;
      estimated_minutes?: number;
      passing_score?: number;
    }) =>
      z
        .object({
          title: z.string().min(1).max(200),
          slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
          description: z.string().max(2000).optional(),
          category: z.string().max(100).optional(),
          difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
          estimated_minutes: z.number().int().min(1).max(240).optional(),
          passing_score: z.number().int().min(1).max(100).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("academy_scenarios")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      title?: string;
      description?: string;
      category?: string;
      difficulty?: string;
      estimated_minutes?: number;
      passing_score?: number;
      is_published?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(2000).optional(),
          category: z.string().max(100).optional(),
          difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
          estimated_minutes: z.number().int().min(1).max(240).optional(),
          passing_score: z.number().int().min(1).max(100).optional(),
          is_published: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("academy_scenarios").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_scenarios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStepsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenarioId: string }) => z.object({ scenarioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: steps, error } = await supabaseAdmin
      .from("academy_scenario_steps")
      .select("*")
      .eq("scenario_id", data.scenarioId)
      .order("step_order", { ascending: true });
    if (error) throw new Error(error.message);
    return steps ?? [];
  });

const choiceSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(300),
  is_correct: z.boolean(),
  points: z.number().min(0).max(100),
  feedback: z.string().max(1000).optional(),
});

export const createStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      scenario_id: string;
      step_order: number;
      prompt: string;
      context?: { fen?: string; incidentType?: string };
      choices: z.infer<typeof choiceSchema>[];
      points?: number;
    }) =>
      z
        .object({
          scenario_id: z.string().uuid(),
          step_order: z.number().int().min(1).max(200),
          prompt: z.string().min(1).max(2000),
          context: z.object({ fen: z.string().max(100).optional(), incidentType: z.string().max(80).optional() }).optional(),
          choices: z.array(choiceSchema).min(2).max(8),
          points: z.number().int().min(1).max(100).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_scenario_steps").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      step_order?: number;
      prompt?: string;
      context?: { fen?: string; incidentType?: string };
      choices?: z.infer<typeof choiceSchema>[];
      points?: number;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          step_order: z.number().int().min(1).max(200).optional(),
          prompt: z.string().min(1).max(2000).optional(),
          context: z.object({ fen: z.string().max(100).optional(), incidentType: z.string().max(80).optional() }).optional(),
          choices: z.array(choiceSchema).min(2).max(8).optional(),
          points: z.number().int().min(1).max(100).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("academy_scenario_steps").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_scenario_steps").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

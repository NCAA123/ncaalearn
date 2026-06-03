import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Helpers ──────────────────────────────────────────────────────────
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => r === "academy_admin" || r === "super_admin" || r === "instructor")) {
    throw new Error("Staff role required");
  }
}

const QuestionType = z.enum(["mcq", "multi", "tf", "essay"]);

// ── Question bank (admin) ────────────────────────────────────────────
export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId?: string; approved?: "all" | "yes" | "no" }) =>
    z
      .object({
        examId: z.string().uuid().optional(),
        approved: z.enum(["all", "yes", "no"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("academy_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.examId) q = q.eq("exam_id", data.examId);
    if (data.approved === "yes") q = q.eq("approved", true);
    if (data.approved === "no") q = q.eq("approved", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      exam_id: string;
      question_type: "mcq" | "multi" | "tf" | "essay";
      question_text: string;
      options?: string[] | null;
      correct_answer?: unknown;
      points?: number;
      category?: string;
      difficulty?: string;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          exam_id: z.string().uuid(),
          question_type: QuestionType,
          question_text: z.string().min(1).max(4000),
          options: z.array(z.string().min(1).max(500)).max(10).nullable().optional(),
          correct_answer: z.unknown().optional(),
          points: z.number().int().min(1).max(100).optional(),
          category: z.string().max(80).optional(),
          difficulty: z.string().max(20).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      exam_id: data.exam_id,
      question_type: data.question_type,
      question_text: data.question_text,
      options: data.options ?? null,
      correct_answer: data.correct_answer ?? null,
      points: data.points ?? 1,
      category: data.category ?? null,
      difficulty: data.difficulty ?? "medium",
      created_by: context.userId,
    } as never;
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("academy_questions")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("academy_questions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (ins as { id: string }).id };
  });

export const approveQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approved: boolean }) =>
    z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_questions")
      .update({ approved: data.approved } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_questions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Candidate runtime ────────────────────────────────────────────────
export const listPublishedExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("academy_exams")
      .select("id,title,description,level,duration_minutes,pass_score,available_from,available_until")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getExamForCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) =>
    z.object({ examId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: exam, error } = await supabaseAdmin
      .from("academy_exams")
      .select("*")
      .eq("id", data.examId)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exam) throw new Error("Exam not available");
    const { data: attempts } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,started_at,submitted_at,score,passed,status")
      .eq("exam_id", data.examId)
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false });
    return { exam, attempts: attempts ?? [] };
  });

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) =>
    z.object({ examId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Reuse any in-progress attempt
    const { data: existing } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,started_at")
      .eq("exam_id", data.examId)
      .eq("user_id", context.userId)
      .eq("status", "in_progress")
      .maybeSingle();
    if (existing) return { attemptId: (existing as { id: string }).id };

    const { data: ins, error } = await supabaseAdmin
      .from("academy_exam_attempts")
      .insert({
        exam_id: data.examId,
        user_id: context.userId,
        status: "in_progress",
        started_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { attemptId: (ins as { id: string }).id };
  });

export const getAttemptRuntime = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) =>
    z.object({ attemptId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt, error } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("*")
      .eq("id", data.attemptId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!attempt) throw new Error("Attempt not found");
    const { data: exam } = await supabaseAdmin
      .from("academy_exams")
      .select("id,title,duration_minutes,pass_score")
      .eq("id", (attempt as { exam_id: string }).exam_id)
      .single();
    // Only approved questions; strip correct_answer from runtime payload
    const { data: questions } = await supabaseAdmin
      .from("academy_questions")
      .select("id,question_type,question_text,options,points")
      .eq("exam_id", (attempt as { exam_id: string }).exam_id)
      .eq("approved", true)
      .order("created_at", { ascending: true });
    const { data: answers } = await supabaseAdmin
      .from("academy_exam_answers")
      .select("question_id,answer")
      .eq("attempt_id", data.attemptId);
    const answerMap: Record<string, unknown> = {};
    (answers ?? []).forEach((a) => {
      answerMap[(a as { question_id: string }).question_id] = (a as { answer: unknown }).answer;
    });
    return { attempt, exam, questions: questions ?? [], answers: answerMap };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; questionId: string; answer: unknown }) =>
    z
      .object({
        attemptId: z.string().uuid(),
        questionId: z.string().uuid(),
        answer: z.unknown(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership + in-progress
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,user_id,status")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || (attempt as { user_id: string }).user_id !== context.userId) {
      throw new Error("Attempt not found");
    }
    if ((attempt as { status: string }).status !== "in_progress") {
      throw new Error("Attempt is not in progress");
    }
    // Upsert by (attempt_id, question_id)
    const { data: existing } = await supabaseAdmin
      .from("academy_exam_answers")
      .select("id")
      .eq("attempt_id", data.attemptId)
      .eq("question_id", data.questionId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("academy_exam_answers")
        .update({ answer: data.answer as never } as never)
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("academy_exam_answers").insert({
        attempt_id: data.attemptId,
        question_id: data.questionId,
        answer: data.answer as never,
      } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const recordViolation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; kind: string; detail?: string }) =>
    z
      .object({
        attemptId: z.string().uuid(),
        kind: z.string().min(1).max(50),
        detail: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,user_id,violations,violation_count")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || (attempt as { user_id: string }).user_id !== context.userId) {
      throw new Error("Attempt not found");
    }
    const prev = ((attempt as { violations: unknown[] }).violations ?? []) as unknown[];
    const next = [
      ...prev,
      { kind: data.kind, detail: data.detail ?? null, at: new Date().toISOString() },
    ];
    const { error } = await supabaseAdmin
      .from("academy_exam_attempts")
      .update({
        violations: next as never,
        violation_count: next.length,
      } as never)
      .eq("id", data.attemptId);
    if (error) throw new Error(error.message);
    return { count: next.length };
  });

function answersEqual(correct: unknown, given: unknown, type: string): boolean {
  if (given == null) return false;
  if (type === "mcq" || type === "tf") {
    return String(correct) === String(given);
  }
  if (type === "multi") {
    const a = Array.isArray(correct) ? [...(correct as unknown[])].map(String).sort() : [];
    const b = Array.isArray(given) ? [...(given as unknown[])].map(String).sort() : [];
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
}

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) =>
    z.object({ attemptId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,user_id,exam_id,status")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || (attempt as { user_id: string }).user_id !== context.userId) {
      throw new Error("Attempt not found");
    }
    if ((attempt as { status: string }).status !== "in_progress") {
      return { alreadyDone: true };
    }
    const examId = (attempt as { exam_id: string }).exam_id;
    const [{ data: exam }, { data: questions }, { data: answers }] = await Promise.all([
      supabaseAdmin.from("academy_exams").select("pass_score").eq("id", examId).single(),
      supabaseAdmin
        .from("academy_questions")
        .select("id,question_type,correct_answer,points")
        .eq("exam_id", examId)
        .eq("approved", true),
      supabaseAdmin
        .from("academy_exam_answers")
        .select("id,question_id,answer")
        .eq("attempt_id", data.attemptId),
    ]);

    const answerByQ = new Map<string, { id: string; answer: unknown }>();
    (answers ?? []).forEach((a) => {
      const row = a as { id: string; question_id: string; answer: unknown };
      answerByQ.set(row.question_id, { id: row.id, answer: row.answer });
    });

    let earned = 0;
    let total = 0;
    let needsManual = false;
    for (const q of questions ?? []) {
      const row = q as {
        id: string;
        question_type: string;
        correct_answer: unknown;
        points: number;
      };
      total += row.points;
      const ans = answerByQ.get(row.id);
      if (row.question_type === "essay") {
        needsManual = true;
        if (ans) {
          await supabaseAdmin
            .from("academy_exam_answers")
            .update({ is_correct: null, points_awarded: 0 } as never)
            .eq("id", ans.id);
        }
        continue;
      }
      const correct = ans ? answersEqual(row.correct_answer, ans.answer, row.question_type) : false;
      const awarded = correct ? row.points : 0;
      earned += awarded;
      if (ans) {
        await supabaseAdmin
          .from("academy_exam_answers")
          .update({ is_correct: correct, points_awarded: awarded } as never)
          .eq("id", ans.id);
      }
    }

    const scorePct = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passScore = (exam as { pass_score: number } | null)?.pass_score ?? 70;
    const passed = !needsManual && scorePct >= passScore;
    const status = needsManual ? "needs_grading" : "graded";

    const { error } = await supabaseAdmin
      .from("academy_exam_attempts")
      .update({
        status,
        submitted_at: new Date().toISOString(),
        score: scorePct,
        passed,
      } as never)
      .eq("id", data.attemptId);
    if (error) throw new Error(error.message);
    return { scorePct, passed, status, needsManual };
  });
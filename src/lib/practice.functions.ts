import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Practice-eligible question types only -- essays need a human grader, so
// they don't fit the "answer, get instant feedback" practice flow.
const PRACTICE_TYPES = ["mcq", "multi", "tf"] as const;

/** Columns exposed to a candidate before they've answered (never correct_answer). */
const RUNTIME_COLUMNS =
  "id,question_type,question_text,options,category,sub_category,difficulty,scenario_text,image_url,fen,pgn,board_instructions";

function isAnswerCorrect(correct: unknown, given: unknown, type: string): boolean {
  if (given == null) return false;
  if (type === "multi") {
    const expected = Array.isArray(correct) ? (correct as unknown[]).map(String) : [];
    const picked = Array.isArray(given) ? (given as unknown[]).map(String) : [];
    if (expected.length === 0) return false;
    return expected.length === picked.length && expected.every((e) => picked.includes(e));
  }
  return String(correct) === String(given);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const listPracticeCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("academy_questions")
      .select("category")
      .eq("approved", true)
      .in("question_type", PRACTICE_TYPES as unknown as string[])
      .not("category", "is", null);
    if (error) throw new Error(error.message);
    const categories = Array.from(new Set((data ?? []).map((r) => r.category as string))).sort();
    return categories;
  });

export const startPracticeSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { count: number; categories?: string[] }) =>
      z
        .object({
          count: z.number().int().min(1).max(50),
          categories: z.array(z.string().max(80)).max(20).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("academy_questions")
      .select(RUNTIME_COLUMNS)
      .eq("approved", true)
      .in("question_type", PRACTICE_TYPES as unknown as string[])
      .limit(300);
    if (data.categories?.length) q = q.in("category", data.categories);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return shuffle(rows ?? []).slice(0, data.count);
  });

export const submitPracticeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { questionId: string; answer: unknown }) =>
      z.object({ questionId: z.string().uuid(), answer: z.unknown() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: question, error } = await supabaseAdmin
      .from("academy_questions")
      .select("id,question_type,correct_answer,category,explanation,fide_reference")
      .eq("id", data.questionId)
      .single();
    if (error) throw new Error(error.message);

    const isCorrect = isAnswerCorrect(question.correct_answer, data.answer, question.question_type);

    await supabaseAdmin.from("academy_practice_attempts").insert({
      user_id: context.userId,
      question_id: data.questionId,
      category: question.category,
      is_correct: isCorrect,
    });

    return {
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation ?? null,
      fideReference: question.fide_reference ?? null,
    };
  });

export const getPracticeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("academy_practice_attempts")
      .select("category,is_correct,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    const total = rows.length;
    const correct = rows.filter((r) => r.is_correct).length;
    const averagePct = total ? Math.round((correct / total) * 100) : 0;

    const byCategory = new Map<string, { total: number; correct: number }>();
    for (const r of rows) {
      const cat = r.category ?? "Uncategorised";
      const entry = byCategory.get(cat) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (r.is_correct) entry.correct += 1;
      byCategory.set(cat, entry);
    }
    const topics = Array.from(byCategory.entries())
      .map(([category, v]) => ({ category, total: v.total, correct: v.correct, pct: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct);

    // Streak: consecutive days (ending today or yesterday) with >=1 attempt.
    const days = new Set(rows.map((r) => new Date(r.created_at).toISOString().slice(0, 10)));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { total, correct, averagePct, streak, topics };
  });

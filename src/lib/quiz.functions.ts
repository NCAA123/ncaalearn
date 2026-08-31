import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StoredQuiz = {
  pass_pct?: number;
  questions: { prompt: string; choices: string[]; answer: number; explanation?: string }[];
};

// Lesson quizzes are comprehension checks, not certifying exams, but the
// correct-answer index still shouldn't ship to the browser before
// submission (it previously did, via a plain `select("*")` on the lesson
// row). These two functions keep the answer key server-side, the same
// pattern already used for the real exam engine in exam.functions.ts.

export const getLessonQuiz = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string }) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("academy_lessons")
      .select("quiz")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const quiz = (row as { quiz: StoredQuiz | null } | null)?.quiz ?? null;
    if (!quiz) return null;
    return {
      pass_pct: quiz.pass_pct ?? 70,
      questions: quiz.questions.map((q) => ({ prompt: q.prompt, choices: q.choices })),
    };
  });

export const gradeLessonQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { lessonId: string; answers: Record<number, number> }) =>
      z
        .object({
          lessonId: z.string().uuid(),
          answers: z.record(z.string(), z.number()),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("academy_lessons")
      .select("quiz")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const quiz = (row as { quiz: StoredQuiz | null } | null)?.quiz ?? null;
    if (!quiz) throw new Error("Quiz not found");

    const passPct = quiz.pass_pct ?? 70;
    const results = quiz.questions.map((q, i) => ({
      correctIndex: q.answer,
      chosen: data.answers[i] ?? null,
      isCorrect: data.answers[i] === q.answer,
      explanation: q.explanation ?? null,
    }));
    const total = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const scorePct = total ? Math.round((correctCount / total) * 100) : 0;

    return { results, scorePct, passed: scorePct >= passPct, passPct };
  });

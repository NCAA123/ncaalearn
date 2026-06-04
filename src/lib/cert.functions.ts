import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => ["instructor", "academy_admin", "super_admin"].includes(r))) {
    throw new Error("Staff role required");
  }
}

// ── My certificates ─────────────────────────────────────────────────
export const listMyCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("academy_certificates")
      .select("id,title,certificate_number,verification_hash,issued_at,metadata")
      .eq("user_id", context.userId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Public verification (no auth) ───────────────────────────────────
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: { hash: string }) =>
    z.object({ hash: z.string().min(8).max(64).regex(/^[a-f0-9]+$/i) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: cert } = await supabaseAdmin
      .from("academy_certificates")
      .select("id,title,certificate_number,issued_at,user_id,metadata")
      .eq("verification_hash", data.hash)
      .maybeSingle();
    if (!cert) return { valid: false as const };
    const row = cert as { user_id: string; title: string; certificate_number: string; issued_at: string; metadata: unknown };
    const { data: profile } = await supabaseAdmin
      .from("academy_profiles")
      .select("first_name,last_name")
      .eq("id", row.user_id)
      .maybeSingle();
    const p = profile as { first_name: string | null; last_name: string | null } | null;
    return {
      valid: true as const,
      title: row.title,
      certificate_number: row.certificate_number,
      issued_at: row.issued_at,
      recipient_name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "NCAA Arbiter",
    };
  });

// ── Attempt result ──────────────────────────────────────────────────
export const getAttemptResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) =>
    z.object({ attemptId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("*")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");
    const a = attempt as { user_id: string; exam_id: string; status: string };
    if (a.user_id !== context.userId) {
      // staff can view any
      await assertStaff(context.userId);
    }
    const [{ data: exam }, { data: questions }, { data: answers }] = await Promise.all([
      supabaseAdmin.from("academy_exams").select("id,title,pass_score").eq("id", a.exam_id).single(),
      supabaseAdmin
        .from("academy_questions")
        .select("id,question_type,question_text,options,correct_answer,points")
        .eq("exam_id", a.exam_id)
        .eq("approved", true)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("academy_exam_answers")
        .select("id,question_id,answer,is_correct,points_awarded")
        .eq("attempt_id", data.attemptId),
    ]);
    return { attempt, exam, questions: questions ?? [], answers: answers ?? [] };
  });

// ── Grading queue (staff) ───────────────────────────────────────────
export const listGradingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data: attempts, error } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,exam_id,user_id,submitted_at,score,status")
      .eq("status", "needs_grading")
      .order("submitted_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    const list = attempts ?? [];
    const userIds = Array.from(new Set(list.map((a) => (a as { user_id: string }).user_id)));
    const examIds = Array.from(new Set(list.map((a) => (a as { exam_id: string }).exam_id)));
    const [{ data: profiles }, { data: exams }] = await Promise.all([
      supabaseAdmin.from("academy_profiles").select("id,first_name,last_name,email").in("id", userIds),
      supabaseAdmin.from("academy_exams").select("id,title").in("id", examIds),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [(p as { id: string }).id, p]));
    const eMap = new Map((exams ?? []).map((e) => [(e as { id: string }).id, e]));
    return list.map((a) => {
      const r = a as { id: string; user_id: string; exam_id: string; submitted_at: string };
      return { ...r, profile: pMap.get(r.user_id) ?? null, exam: eMap.get(r.exam_id) ?? null };
    });
  });

export const gradeEssayAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answerId: string; pointsAwarded: number }) =>
    z.object({ answerId: z.string().uuid(), pointsAwarded: z.number().min(0).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_exam_answers")
      .update({
        points_awarded: data.pointsAwarded,
        is_correct: data.pointsAwarded > 0,
      } as never)
      .eq("id", data.answerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizeGrading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) =>
    z.object({ attemptId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("exam_id,user_id")
      .eq("id", data.attemptId)
      .single();
    const a = attempt as { exam_id: string; user_id: string };
    const [{ data: exam }, { data: questions }, { data: answers }] = await Promise.all([
      supabaseAdmin.from("academy_exams").select("title,pass_score,level").eq("id", a.exam_id).single(),
      supabaseAdmin.from("academy_questions").select("id,points").eq("exam_id", a.exam_id).eq("approved", true),
      supabaseAdmin.from("academy_exam_answers").select("question_id,points_awarded").eq("attempt_id", data.attemptId),
    ]);
    const total = (questions ?? []).reduce((s, q) => s + ((q as { points: number }).points ?? 0), 0);
    const earned = (answers ?? []).reduce((s, a) => s + Number((a as { points_awarded: number }).points_awarded ?? 0), 0);
    const scorePct = total > 0 ? Math.round((earned / total) * 100) : 0;
    const ex = exam as { title: string; pass_score: number; level: string | null };
    const passed = scorePct >= (ex?.pass_score ?? 70);
    await supabaseAdmin
      .from("academy_exam_attempts")
      .update({ status: "graded", score: scorePct, passed } as never)
      .eq("id", data.attemptId);
    if (passed) {
      await maybeIssueCertificate(a.user_id, a.exam_id, ex.title);
    }
    return { scorePct, passed };
  });

export async function maybeIssueCertificate(userId: string, examId: string, examTitle: string) {
  // Skip if already issued for this exam
  const { data: existing } = await supabaseAdmin
    .from("academy_certificates")
    .select("id")
    .eq("user_id", userId)
    .contains("metadata", { exam_id: examId } as never)
    .maybeSingle();
  if (existing) return;
  const hash = crypto.randomUUID().replace(/-/g, "");
  const certNo = `NCAA-${Date.now().toString(36).toUpperCase()}-${hash.slice(0, 6).toUpperCase()}`;
  await supabaseAdmin.from("academy_certificates").insert({
    user_id: userId,
    title: `${examTitle} — Certificate of Completion`,
    certificate_number: certNo,
    verification_hash: hash,
    metadata: { exam_id: examId, auto: true } as never,
  } as never);
}
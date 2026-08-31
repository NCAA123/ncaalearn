import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { maybeIssueCertificate } from "./cert.functions";
import { invalidateDashboard, invalidateAdminDashboard } from "./dashboard.server";

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
const ExtendedQuestionType = z.enum(["mcq", "multi", "tf", "essay", "scenario", "board"]);

/** Question columns exposed to a candidate mid-attempt (never correct_answer). */
const RUNTIME_QUESTION_COLUMNS =
  "id,question_type,question_text,options,points,category,sub_category,difficulty,scenario_text,image_url,fen,pgn,board_instructions,shuffle_options,min_words";

// ── Session pinning / throttling helpers ─────────────────────────────
function clientFingerprint() {
  let ip: string | null = null;
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    ip = null;
  }
  if (!ip) {
    try {
      ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-real-ip") ?? null;
    } catch {
      ip = null;
    }
  }
  let ua: string | null = null;
  try {
    ua = getRequestHeader("user-agent") ?? null;
  } catch {
    ua = null;
  }
  return { ip, ua: ua ? ua.slice(0, 400) : null };
}

type PinnedAttempt = {
  id: string;
  user_id: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  last_action_at: string | null;
  ip_change_count: number | null;
  violations?: unknown[] | null;
};

async function appendViolation(
  attemptId: string,
  userId: string,
  kind: string,
  detail: string | null,
  severity: "low" | "medium" | "high",
) {
  const { data: row } = await supabaseAdmin
    .from("academy_exam_attempts")
    .select("violations")
    .eq("id", attemptId)
    .maybeSingle();
  const prev = ((row as { violations: unknown[] } | null)?.violations ?? []) as unknown[];
  const next = [...prev, { kind, detail, at: new Date().toISOString(), source: "server" }];
  await supabaseAdmin
    .from("academy_exam_attempts")
    .update({ violations: next as never, violation_count: next.length } as never)
    .eq("id", attemptId);
  await supabaseAdmin.from("academy_exam_violations").insert({
    attempt_id: attemptId,
    user_id: userId,
    violation_type: kind,
    severity,
    metadata: { detail } as never,
  } as never);
  return next.length;
}

/**
 * Loads an attempt, verifies ownership, enforces IP/user-agent pinning and a
 * 1-request-per-second write throttle. Returns the attempt row.
 */
async function guardAttemptWrite(
  attemptId: string,
  userId: string,
  opts: { throttle?: boolean; requireInProgress?: boolean } = {},
) {
  const { data } = await supabaseAdmin
    .from("academy_exam_attempts")
    .select("id,user_id,status,ip_address,user_agent,last_action_at,ip_change_count,violations")
    .eq("id", attemptId)
    .maybeSingle();
  const attempt = data as PinnedAttempt | null;
  if (!attempt || attempt.user_id !== userId) throw new Error("Attempt not found");
  if (opts.requireInProgress !== false && attempt.status !== "in_progress") {
    throw new Error("Attempt is not in progress");
  }

  const now = Date.now();

  // 1 request per second per attempt.
  if (opts.throttle) {
    const last = attempt.last_action_at ? new Date(attempt.last_action_at).getTime() : 0;
    if (now - last < 1000) {
      throw new Error("Too many requests — please slow down.");
    }
  }

  const { ip, ua } = clientFingerprint();
  const patch: Record<string, unknown> = { last_action_at: new Date(now).toISOString() };

  if (!attempt.ip_address && ip) patch['ip_address'] = ip;
  if (!attempt.user_agent && ua) patch['user_agent'] = ua;

  let ipChanged = false;
  if (attempt.ip_address && ip && attempt.ip_address !== ip) {
    ipChanged = true;
    patch['ip_change_count'] = (attempt.ip_change_count ?? 0) + 1;
  }
  const uaChanged = Boolean(attempt.user_agent && ua && attempt.user_agent !== ua);

  await supabaseAdmin
    .from("academy_exam_attempts")
    .update(patch as never)
    .eq("id", attemptId);

  if (ipChanged) {
    await appendViolation(
      attemptId,
      userId,
      "ip_change",
      `${attempt.ip_address} → ${ip}`,
      "high",
    );
  }
  if (uaChanged) {
    await appendViolation(attemptId, userId, "device_change", "User agent changed", "high");
  }

  // Three or more network hops during a single exam is treated as session
  // hijacking: the attempt is terminated and flagged for review.
  const changes = (patch['ip_change_count'] as number | undefined) ?? attempt.ip_change_count ?? 0;
  if (changes >= 3) {
    await supabaseAdmin
      .from("academy_exam_attempts")
      .update({ status: "flagged" } as never)
      .eq("id", attemptId);
    throw new Error("Exam session terminated: the network address changed too many times.");
  }

  return attempt;
}

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
      question_type: string;
      question_text: string;
      options?: string[] | null;
      correct_answer?: unknown;
      points?: number;
      category?: string;
      difficulty?: string;
      sub_category?: string;
      tags?: string[];
      explanation?: string;
      fide_reference?: string;
      reference_material?: string;
      image_url?: string;
      fen?: string;
      pgn?: string;
      board_instructions?: string;
      scenario_text?: string;
      shuffle_options?: boolean;
      min_words?: number | null;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          exam_id: z.string().uuid(),
          question_type: ExtendedQuestionType,
          question_text: z.string().min(1).max(8000),
          options: z.array(z.string().min(1).max(1000)).max(10).nullable().optional(),
          correct_answer: z.unknown().optional(),
          points: z.number().int().min(1).max(100).optional(),
          category: z.string().max(80).optional(),
          difficulty: z.string().max(20).optional(),
          sub_category: z.string().max(80).optional(),
          tags: z.array(z.string().max(40)).max(20).optional(),
          explanation: z.string().max(4000).optional(),
          fide_reference: z.string().max(120).optional(),
          reference_material: z.string().max(200).optional(),
          image_url: z.string().max(500).optional(),
          fen: z.string().max(120).optional(),
          pgn: z.string().max(8000).optional(),
          board_instructions: z.string().max(1000).optional(),
          scenario_text: z.string().max(4000).optional(),
          shuffle_options: z.boolean().optional(),
          min_words: z.number().int().min(0).max(2000).nullable().optional(),
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
      sub_category: data.sub_category ?? null,
      tags: data.tags ?? [],
      explanation: data.explanation ?? null,
      fide_reference: data.fide_reference ?? null,
      reference_material: data.reference_material ?? null,
      image_url: data.image_url ?? null,
      fen: data.fen ?? null,
      pgn: data.pgn ?? null,
      board_instructions: data.board_instructions ?? null,
      scenario_text: data.scenario_text ?? null,
      shuffle_options: data.shuffle_options ?? false,
      min_words: data.min_words ?? null,
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

// ── Pre-flight access control (§13.1) ────────────────────────────────
type PreflightCheck = { key: string; label: string; ok: boolean; reason?: string; guidance?: string };

async function runPreflight(userId: string, examId: string) {
  const { data: examRow } = await supabaseAdmin
    .from("academy_exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();
  const exam = examRow as Record<string, unknown> | null;
  if (!exam || exam['is_published'] !== true) throw new Error("Exam not available");

  const checks: PreflightCheck[] = [];
  const now = Date.now();

  // 6. Availability window
  const from = exam['available_from'] ? new Date(exam['available_from'] as string).getTime() : null;
  const until = exam['available_until'] ? new Date(exam['available_until'] as string).getTime() : null;
  checks.push({
    key: "window",
    label: "Exam is open",
    ok: (from == null || now >= from) && (until == null || now <= until),
    reason:
      from != null && now < from
        ? `This exam opens on ${new Date(from).toLocaleString()}.`
        : until != null && now > until
          ? `This exam closed on ${new Date(until).toLocaleString()}.`
          : undefined,
    guidance: "Come back inside the published exam window.",
  });

  // 8. Account provisioned / not suspended
  const { data: roleRows } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  checks.push({
    key: "account",
    label: "Account is active",
    ok: (roleRows ?? []).length > 0,
    reason: (roleRows ?? []).length > 0 ? undefined : "Your academy account is not active.",
    guidance: "Contact the secretariat to have your academy account activated.",
  });

  // 1 & 2. Seminar enrolment and attendance
  const seminarId = exam['seminar_id'] as string | null;
  if (seminarId) {
    const { data: regRow } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("status,attendance_percent,exam_unlocked")
      .eq("seminar_id", seminarId)
      .eq("user_id", userId)
      .maybeSingle();
    const reg = regRow as { status: string; attendance_percent: number | null; exam_unlocked: boolean } | null;
    checks.push({
      key: "enrolled",
      label: "Registered for the linked seminar",
      ok: !!reg && reg.status !== "cancelled",
      reason: reg ? undefined : "You are not registered for the seminar tied to this exam.",
      guidance: "Register for the seminar first.",
    });
    if (exam['require_attendance'] === true) {
      const { data: seminarRow } = await supabaseAdmin
        .from("academy_seminars")
        .select("min_attendance_percent")
        .eq("id", seminarId)
        .maybeSingle();
      const min = ((seminarRow as { min_attendance_percent: number | null } | null)?.min_attendance_percent) ?? 80;
      const pct = reg?.attendance_percent ?? 0;
      checks.push({
        key: "attendance",
        label: `Attendance of at least ${min}%`,
        ok: !!reg?.exam_unlocked || pct >= min,
        reason: reg?.exam_unlocked || pct >= min ? undefined : `Your recorded attendance is ${pct}%.`,
        guidance: "Ask the seminar instructor to review your attendance record.",
      });
    }
  }

  // 7. Prerequisite exam
  const prereqId = exam['prerequisite_exam_id'] as string | null;
  if (prereqId) {
    const { data: prereqPass } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id")
      .eq("exam_id", prereqId)
      .eq("user_id", userId)
      .eq("passed", true)
      .limit(1);
    const { data: prereqExam } = await supabaseAdmin
      .from("academy_exams")
      .select("title")
      .eq("id", prereqId)
      .maybeSingle();
    const title = (prereqExam as { title: string } | null)?.title ?? "the prerequisite exam";
    checks.push({
      key: "prerequisite",
      label: `Passed ${title}`,
      ok: (prereqPass ?? []).length > 0,
      reason: (prereqPass ?? []).length > 0 ? undefined : `You must pass ${title} first.`,
      guidance: "Complete and pass the prerequisite exam, then return here.",
    });
  }

  // 3, 4, 5. Attempts, limits and cooldown
  const { data: attemptRows } = await supabaseAdmin
    .from("academy_exam_attempts")
    .select("id,status,started_at,submitted_at,passed,score")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  const attempts = (attemptRows ?? []) as Array<{
    id: string;
    status: string;
    started_at: string;
    submitted_at: string | null;
    passed: boolean | null;
    score: number | null;
  }>;
  const inProgress = attempts.find((a) => a.status === "in_progress");
  const finished = attempts.filter((a) => a.status !== "in_progress");
  const maxAttempts = (exam['max_attempts'] as number | null) ?? 3;
  const cooldownHours = (exam['cooldown_hours'] as number | null) ?? 0;

  checks.push({
    key: "attempts",
    label: `Attempts remaining (${Math.max(0, maxAttempts - finished.length)} of ${maxAttempts})`,
    ok: finished.length < maxAttempts,
    reason: finished.length < maxAttempts ? undefined : `You have used all ${maxAttempts} permitted attempts.`,
    guidance: "Contact the secretariat if you believe you should be granted another attempt.",
  });

  const last = finished[0];
  const lastEnd = last?.submitted_at ? new Date(last.submitted_at).getTime() : null;
  const cooldownUntil = lastEnd != null && cooldownHours > 0 ? lastEnd + cooldownHours * 3600_000 : null;
  checks.push({
    key: "cooldown",
    label: cooldownHours > 0 ? `${cooldownHours}h cooldown between attempts` : "No cooldown",
    ok: cooldownUntil == null || now >= cooldownUntil,
    reason:
      cooldownUntil != null && now < cooldownUntil
        ? `You can retake this exam from ${new Date(cooldownUntil).toLocaleString()}.`
        : undefined,
    guidance: "Use the waiting period to revise before your next attempt.",
  });

  const { count: questionCount } = await supabaseAdmin
    .from("academy_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId)
    .eq("approved", true);

  return {
    exam: {
      id: exam['id'] as string,
      title: exam['title'] as string,
      description: (exam['description'] as string | null) ?? null,
      level: exam['level'] as string,
      duration_minutes: exam['duration_minutes'] as number,
      pass_score: exam['pass_score'] as number,
      instructions: (exam['instructions'] as string | null) ?? null,
      available_from: (exam['available_from'] as string | null) ?? null,
      available_until: (exam['available_until'] as string | null) ?? null,
      seminar_id: (exam['seminar_id'] as string | null) ?? null,
    },
    checks,
    attempts,
    inProgressAttemptId: inProgress?.id ?? null,
    attemptNumber: Math.min(finished.length + 1, maxAttempts),
    maxAttempts,
    cooldownHours,
    cooldownUntil: cooldownUntil ? new Date(cooldownUntil).toISOString() : null,
    questionCount: questionCount ?? 0,
    canStart: checks.every((c) => c.ok),
  };
}

export const getExamPreflight = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) => z.object({ examId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => runPreflight(context.userId, data.examId));


// ── Question bank: categories, review workflow, import, analytics ────
export const listQuestionCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("academy_question_categories")
      .select("id,name,parent,sort_order")
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

/** Moves a question through draft → pending_review → approved / rejected / revision_needed. */
export const setQuestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; comments?: string; reason?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "pending_review", "approved", "rejected", "revision_needed"]),
        comments: z.string().max(2000).optional(),
        reason: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const approved = data.status === "approved";
    const { error } = await supabaseAdmin
      .from("academy_questions")
      .update({
        status: data.status,
        approved,
        review_comments: data.comments ?? null,
        rejection_reason: data.status === "rejected" ? (data.reason ?? null) : null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.status };
  });

/** Bulk import from a parsed CSV/Excel sheet. Rows are validated one by one. */
export const importQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exam_id: string; rows: Record<string, string>[] }) =>
    z
      .object({
        exam_id: z.string().uuid(),
        rows: z.array(z.record(z.string(), z.string())).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: cats } = await supabaseAdmin
      .from("academy_question_categories")
      .select("name");
    const catNames = new Set((cats ?? []).map((c) => (c as { name: string }).name.toLowerCase()));
    const validTypes = ["mcq", "multi", "tf", "essay", "scenario", "board"];
    const validDiff = ["easy", "medium", "hard", "expert"];

    const errors: { row: number; error: string }[] = [];
    const payloads: Record<string, unknown>[] = [];

    data.rows.forEach((raw, idx) => {
      const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), (v ?? "").trim()]),
      ) as Record<string, string>;
      const line = idx + 2; // account for the header row
      const text = row['question_text'] ?? "";
      const type = (row['question_type'] ?? "mcq").toLowerCase();
      if (!text) return void errors.push({ row: line, error: "question_text is required" });
      if (!validTypes.includes(type)) return void errors.push({ row: line, error: `invalid question_type "${type}"` });
      const difficulty = (row['difficulty'] || "medium").toLowerCase();
      if (!validDiff.includes(difficulty)) return void errors.push({ row: line, error: `invalid difficulty "${difficulty}"` });
      const category = row['category'] ?? "";
      if (category && !catNames.has(category.toLowerCase())) {
        return void errors.push({ row: line, error: `unknown category "${category}"` });
      }
      const options = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"]
        .map((k) => row[k] ?? "")
        .filter((v) => v.length > 0);
      const correctLetters = (row['correct_options'] ?? "")
        .split(/[,;| ]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const indexes = correctLetters
        .map((l) => (/^[A-F]$/.test(l) ? l.charCodeAt(0) - 65 : Number(l) - 1))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);

      let correct: unknown = null;
      if (type === "essay") {
        correct = null;
      } else if (type === "multi") {
        if (indexes.length === 0) return void errors.push({ row: line, error: "multi-select needs at least one correct option" });
        correct = indexes;
      } else if (type === "tf") {
        const val = (row['correct_options'] ?? "").toLowerCase();
        if (!["true", "false", "a", "b"].includes(val)) {
          return void errors.push({ row: line, error: "true/false needs correct_options = TRUE or FALSE" });
        }
        correct = val === "true" || val === "a" ? 0 : 1;
      } else {
        if (indexes.length !== 1) return void errors.push({ row: line, error: "MCQ needs exactly one correct option" });
        correct = indexes[0];
      }
      if (type !== "essay" && type !== "tf" && options.length < 2) {
        return void errors.push({ row: line, error: "at least two options are required" });
      }

      payloads.push({
        exam_id: data.exam_id,
        question_type: type,
        question_text: text,
        options: type === "essay" ? null : type === "tf" ? ["True", "False"] : options,
        correct_answer: correct,
        points: Math.max(1, Number(row['marks'] || 1) || 1),
        category: category || null,
        sub_category: row['sub_category'] || null,
        difficulty,
        explanation: row['explanation'] || null,
        fide_reference: row['fide_reference'] || null,
        tags: (row['tags'] ?? "").split(/[,;]+/).map((t) => t.trim()).filter(Boolean),
        status: "draft",
        approved: false,
        created_by: context.userId,
      });
    });

    let imported = 0;
    if (payloads.length > 0) {
      const { error } = await supabaseAdmin.from("academy_questions").insert(payloads as never);
      if (error) throw new Error(error.message);
      imported = payloads.length;
    }
    return { imported, errors };
  });

export const getQuestionAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) => z.object({ examId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("academy_questions")
      .select(
        "id,question_text,question_type,difficulty,category,times_used,times_answered,times_correct,total_time_seconds,flag_count,options",
      )
      .eq("exam_id", data.examId);
    const questions = (rows ?? []) as Array<{
      id: string;
      question_text: string;
      difficulty: string | null;
      times_answered: number;
      times_correct: number;
      total_time_seconds: number;
      flag_count: number;
      times_used: number;
      options: string[] | null;
    }>;

    // Most common wrong answer per question.
    const { data: answers } = await supabaseAdmin
      .from("academy_exam_answers")
      .select("question_id,answer,is_correct")
      .in("question_id", questions.map((q) => q.id).slice(0, 500));
    const wrong = new Map<string, Map<string, number>>();
    (answers ?? []).forEach((a) => {
      const row = a as { question_id: string; answer: unknown; is_correct: boolean | null };
      if (row.is_correct !== false) return;
      const key = JSON.stringify(row.answer);
      const m = wrong.get(row.question_id) ?? new Map<string, number>();
      m.set(key, (m.get(key) ?? 0) + 1);
      wrong.set(row.question_id, m);
    });

    return questions.map((q) => {
      const m = wrong.get(q.id);
      let common: string | null = null;
      if (m && m.size > 0) {
        const [best] = [...m.entries()].sort((a, b) => b[1] - a[1]);
        const parsed = best ? (JSON.parse(best[0]) as unknown) : null;
        common =
          typeof parsed === "number" && q.options?.[parsed]
            ? (q.options[parsed] as string)
            : JSON.stringify(parsed);
      }
      const correctRate = q.times_answered > 0 ? Math.round((q.times_correct / q.times_answered) * 100) : null;
      const avgTime = q.times_answered > 0 ? Math.round(q.total_time_seconds / q.times_answered) : null;
      const flagRate = q.times_answered > 0 ? Math.round((q.flag_count / q.times_answered) * 100) : null;
      return { ...q, correctRate, avgTime, flagRate, commonWrongAnswer: common };
    });
  });

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
    const pre = await runPreflight(context.userId, data.examId);
    if (pre.inProgressAttemptId) return { attemptId: pre.inProgressAttemptId };
    const blocker = pre.checks.find((c) => !c.ok);
    if (blocker) throw new Error(blocker.reason ?? "You cannot start this exam right now.");
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
        ip_address: clientFingerprint().ip,
        user_agent: clientFingerprint().ua,
        last_action_at: new Date().toISOString(),
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
      .select("id,title,duration_minutes,pass_score,instructions,shuffle_questions")
      .eq("id", (attempt as { exam_id: string }).exam_id)
      .single();
    // Only approved questions; strip correct_answer from runtime payload
    const { data: questions } = await supabaseAdmin
      .from("academy_questions")
      .select(RUNTIME_QUESTION_COLUMNS)
      .eq("exam_id", (attempt as { exam_id: string }).exam_id)
      .eq("approved", true)
      .order("created_at", { ascending: true });
    const { data: answers } = await supabaseAdmin
      .from("academy_exam_answers")
      .select("question_id,answer,flagged,time_spent_seconds")
      .eq("attempt_id", data.attemptId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answerMap: Record<string, any> = {};
    const flaggedIds: string[] = [];
    (answers ?? []).forEach((a) => {
      const row = a as { question_id: string; answer: unknown; flagged: boolean };
      answerMap[row.question_id] = row.answer;
      if (row.flagged) flaggedIds.push(row.question_id);
    });
    return {
      attempt,
      exam,
      questions: questions ?? [],
      answers: answerMap,
      flagged: flaggedIds,
      serverNow: new Date().toISOString(),
    };
  });

/** Authoritative clock: the client polls this every 60s so the timer cannot be faked. */
export const getAttemptReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: attemptRow } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,user_id,exam_id,status,score,passed,started_at,submitted_at,violation_count")
      .eq("id", data.attemptId)
      .maybeSingle();
    const attempt = attemptRow as {
      id: string; user_id: string; exam_id: string; status: string; score: number | null;
      passed: boolean | null; started_at: string; submitted_at: string | null; violation_count: number | null;
    } | null;
    if (!attempt || attempt.user_id !== context.userId) throw new Error("Attempt not found");
    if (attempt.status === "in_progress") throw new Error("This attempt has not been submitted yet");

    const [{ data: exam }, { data: questionRows }, { data: answerRows }] = await Promise.all([
      supabaseAdmin.from("academy_exams").select("title,pass_score,duration_minutes").eq("id", attempt.exam_id).single(),
      supabaseAdmin
        .from("academy_questions")
        .select(
          "id,question_type,question_text,options,points,category,sub_category,correct_answer,explanation,fide_reference,scenario_text,fen,pgn,image_url",
        )
        .eq("exam_id", attempt.exam_id)
        .eq("approved", true)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("academy_exam_answers")
        .select("question_id,answer,is_correct,points_awarded,time_spent_seconds,flagged")
        .eq("attempt_id", data.attemptId),
    ]);

    const byQ = new Map(
      (answerRows ?? []).map((a) => [
        (a as { question_id: string }).question_id,
        a as {
          answer: unknown; is_correct: boolean | null; points_awarded: number | null;
          time_spent_seconds: number | null; flagged: boolean | null;
        },
      ]),
    );

    const questions = (questionRows ?? []).map((q) => {
      const row = q as Record<string, unknown>;
      const ans = byQ.get(row['id'] as string) ?? null;
      return {
        id: row['id'] as string,
        question_type: row['question_type'] as string,
        question_text: row['question_text'] as string,
        options: (row['options'] as string[] | null) ?? null,
        points: row['points'] as number,
        category: (row['category'] as string | null) ?? null,
        sub_category: (row['sub_category'] as string | null) ?? null,
        correct_answer: JSON.stringify(row['correct_answer'] ?? null),
        explanation: (row['explanation'] as string | null) ?? null,
        fide_reference: (row['fide_reference'] as string | null) ?? null,
        scenario_text: (row['scenario_text'] as string | null) ?? null,
        fen: (row['fen'] as string | null) ?? null,
        pgn: (row['pgn'] as string | null) ?? null,
        image_url: (row['image_url'] as string | null) ?? null,
        given_answer: JSON.stringify(ans?.answer ?? null),
        is_correct: ans?.is_correct ?? null,
        points_awarded: ans?.points_awarded ?? 0,
        time_spent_seconds: ans?.time_spent_seconds ?? 0,
        flagged: ans?.flagged ?? false,
      };
    });

    // Performance by category
    const catMap = new Map<string, { earned: number; total: number; correct: number; count: number }>();
    questions.forEach((q) => {
      const key = q.category ?? "Uncategorised";
      const c = catMap.get(key) ?? { earned: 0, total: 0, correct: 0, count: 0 };
      c.earned += q.points_awarded ?? 0;
      c.total += q.points;
      c.count += 1;
      if (q.is_correct) c.correct += 1;
      catMap.set(key, c);
    });

    const totalMarks = questions.reduce((s, q) => s + q.points, 0);
    const earnedMarks = questions.reduce((s, q) => s + (q.points_awarded ?? 0), 0);

    return {
      attempt,
      exam: exam as { title: string; pass_score: number; duration_minutes: number },
      questions,
      totals: {
        totalMarks,
        earnedMarks: Math.round(earnedMarks * 100) / 100,
        correctCount: questions.filter((q) => q.is_correct).length,
        questionCount: questions.length,
        timeTakenSeconds: attempt.submitted_at
          ? Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000))
          : null,
      },
      categories: [...catMap.entries()].map(([name, c]) => ({
        name,
        percent: c.total > 0 ? Math.round((c.earned / c.total) * 100) : 0,
        correct: c.correct,
        count: c.count,
      })),
    };
  });

export const getAttemptClock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("started_at,status,exam_id,user_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    const attempt = row as { started_at: string; status: string; exam_id: string; user_id: string } | null;
    if (!attempt || attempt.user_id !== context.userId) throw new Error("Attempt not found");
    const { data: exam } = await supabaseAdmin
      .from("academy_exams")
      .select("duration_minutes")
      .eq("id", attempt.exam_id)
      .single();
    const duration = (exam as { duration_minutes: number }).duration_minutes;
    const endsAt = new Date(attempt.started_at).getTime() + duration * 60_000;
    return {
      status: attempt.status,
      remainingSeconds: Math.max(0, Math.floor((endsAt - Date.now()) / 1000)),
    };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; questionId: string; answer: unknown; flagged?: boolean; timeSpentSeconds?: number }) =>
    z
      .object({
        attemptId: z.string().uuid(),
        questionId: z.string().uuid(),
        answer: z.unknown(),
        flagged: z.boolean().optional(),
        timeSpentSeconds: z.number().int().min(0).max(86400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership, pin to the originating IP/device, throttle to 1 req/s
    await guardAttemptWrite(data.attemptId, context.userId, { throttle: true });
    // Upsert by (attempt_id, question_id)
    const { data: existing } = await supabaseAdmin
      .from("academy_exam_answers")
      .select("id,time_spent_seconds")
      .eq("attempt_id", data.attemptId)
      .eq("question_id", data.questionId)
      .maybeSingle();
    const patch: Record<string, unknown> = { answer: data.answer };
    if (data.flagged !== undefined) patch['flagged'] = data.flagged;
    if (data.timeSpentSeconds !== undefined) patch['time_spent_seconds'] = data.timeSpentSeconds;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("academy_exam_answers")
        .update(patch as never)
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("academy_exam_answers").insert({
        attempt_id: data.attemptId,
        question_id: data.questionId,
        ...patch,
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
    await guardAttemptWrite(data.attemptId, context.userId, { requireInProgress: false });
    const { data: attempt } = await supabaseAdmin
      .from("academy_exam_attempts")
      .select("id,user_id,violations,violation_count")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");
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
    const count = next.length;
    const devtools = next.some((v) => (v as { kind?: string }).kind === "devtools");
    const tabSwitches = next.filter((v) => (v as { kind?: string }).kind === "tab_hidden").length;
    return {
      count,
      // 3 → warn the candidate, 10 → flag for admin review,
      // 20 (or DevTools + 5 tab switches) → auto-submit and flag.
      warn: count >= 3,
      flagged: count >= 10,
      autoSubmit: count >= 20 || (devtools && tabSwitches >= 5),
    };
  });

/**
 * Returns the fraction (0–1) of a question's marks earned.
 * Multi-select uses partial credit: (correct − incorrect) / total correct, floored at 0.
 */
function gradeFraction(correct: unknown, given: unknown, type: string): number {
  if (given == null) return 0;
  if (type === "multi") {
    const expected = Array.isArray(correct) ? (correct as unknown[]).map(String) : [];
    const picked = Array.isArray(given) ? (given as unknown[]).map(String) : [];
    if (expected.length === 0) return 0;
    const hits = picked.filter((p) => expected.includes(p)).length;
    const misses = picked.filter((p) => !expected.includes(p)).length;
    return Math.max(0, (hits - misses) / expected.length);
  }
  // mcq, tf, scenario and board questions with an objective answer
  return String(correct) === String(given) ? 1 : 0;
}

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) =>
    z.object({ attemptId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await guardAttemptWrite(data.attemptId, context.userId, { requireInProgress: false });
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
        .select("id,question_type,correct_answer,points,category")
        .eq("exam_id", examId)
        .eq("approved", true),
      supabaseAdmin
        .from("academy_exam_answers")
        .select("id,question_id,answer,flagged,time_spent_seconds")
        .eq("attempt_id", data.attemptId),
    ]);

    const answerByQ = new Map<string, { id: string; answer: unknown; flagged: boolean; time: number }>();
    (answers ?? []).forEach((a) => {
      const row = a as {
        id: string;
        question_id: string;
        answer: unknown;
        flagged: boolean | null;
        time_spent_seconds: number | null;
      };
      answerByQ.set(row.question_id, {
        id: row.id,
        answer: row.answer,
        flagged: row.flagged ?? false,
        time: row.time_spent_seconds ?? 0,
      });
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
        category: string | null;
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
      const fraction = ans ? gradeFraction(row.correct_answer, ans.answer, row.question_type) : 0;
      const awarded = Math.round(fraction * row.points * 100) / 100;
      const correct = fraction >= 1;
      earned += awarded;
      if (ans) {
        await supabaseAdmin
          .from("academy_exam_answers")
          .update({ is_correct: correct, points_awarded: awarded } as never)
          .eq("id", ans.id);
      }
    }

    // Question analytics roll-up (§14.5), one pass per question.
    for (const q of questions ?? []) {
      const row = q as { id: string; question_type: string; correct_answer: unknown; points: number };
      const ans = answerByQ.get(row.id);
      const { data: statRow } = await supabaseAdmin
        .from("academy_questions")
        .select("times_used,times_answered,times_correct,total_time_seconds,flag_count")
        .eq("id", row.id)
        .maybeSingle();
      const s = (statRow ?? {}) as {
        times_used?: number;
        times_answered?: number;
        times_correct?: number;
        total_time_seconds?: number;
        flag_count?: number;
      };
      const answered = ans != null && ans.answer != null;
      const correct =
        answered && row.question_type !== "essay"
          ? gradeFraction(row.correct_answer, ans!.answer, row.question_type) >= 1
          : false;
      await supabaseAdmin
        .from("academy_questions")
        .update({
          times_used: (s.times_used ?? 0) + 1,
          times_answered: (s.times_answered ?? 0) + (answered ? 1 : 0),
          times_correct: (s.times_correct ?? 0) + (correct ? 1 : 0),
          total_time_seconds: (s.total_time_seconds ?? 0) + (ans?.time ?? 0),
          flag_count: (s.flag_count ?? 0) + (ans?.flagged ? 1 : 0),
        } as never)
        .eq("id", row.id);
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
    invalidateDashboard(context.userId);
    invalidateAdminDashboard();
    if (passed && !needsManual) {
      const ex = exam as { pass_score: number } | null;
      const { data: examFull } = await supabaseAdmin
        .from("academy_exams")
        .select("title")
        .eq("id", examId)
        .single();
      if (examFull) {
        await maybeIssueCertificate(
          context.userId,
          examId,
          (examFull as { title: string }).title,
        );
      }
      void ex;
    }
    return { scorePct, passed, status, needsManual };
  });
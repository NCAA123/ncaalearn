import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user dashboard aggregates are expensive, so results are memoised for
 * 5 minutes (the spec's Redis TTL; this runtime has no Redis, so an
 * in-process LRU-ish map is used instead).
 */
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) {
    for (const [k, v] of cache) if (Date.now() - v.at > TTL_MS) cache.delete(k);
  }
  return value;
}

// Called by every write path that changes what a dashboard shows (progress,
// enrollment, exam grading, cert/license issuance, CPD/promotion review) so
// the cache never serves numbers that are already stale — see callers in
// exam.functions.ts, cert.functions.ts, license.functions.ts,
// promotions.functions.ts, admin.functions.ts, and dashboard.functions.ts
// (touchCandidateDashboard, called from client-side writes).
export function invalidateDashboard(userId: string) {
  cache.delete(`candidate:${userId}`);
  cache.delete(`arbiter:${userId}`);
  cache.delete(`instructor:${userId}`);
}

export function invalidateAdminDashboard() {
  cache.delete("admin:overview");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const num = (v: unknown) => Number(v ?? 0) || 0;

// ── Candidate ────────────────────────────────────────────────────────
export async function buildCandidateDashboard(supabase: SB, userId: string) {
  return cached(`candidate:${userId}`, async () => {
    const nowIso = new Date().toISOString();

    const [{ data: enrollments }, { data: attempts }, { data: progress }, { data: certs }] =
      await Promise.all([
        supabase
          .from("academy_enrollments")
          .select("id,course_id,progress_pct,enrolled_at,completed_at,academy_courses(id,title,slug,level)")
          .eq("user_id", userId),
        supabase
          .from("academy_exam_attempts")
          .select("id,exam_id,score,passed,status,started_at,submitted_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(20),
        supabase
          .from("academy_lesson_progress")
          .select("lesson_id,completed,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(200),
        supabase
          .from("academy_certificates")
          .select("id,title,issued_at")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false })
          .limit(5),
      ]);

    const courseIds = (enrollments ?? []).map((e: Row) => e.course_id as string);

    // Modules + lessons of enrolled courses → module completion + next action
    let modules: Row[] = [];
    let lessons: Row[] = [];
    if (courseIds.length) {
      const { data: mods } = await supabase
        .from("academy_modules")
        .select("id,course_id,title,order_index")
        .in("course_id", courseIds)
        .order("order_index");
      modules = (mods ?? []) as Row[];
      if (modules.length) {
        const { data: ls } = await supabase
          .from("academy_lessons")
          .select("id,module_id,title,order_index")
          .in("module_id", modules.map((m) => m.id as string))
          .order("order_index");
        lessons = (ls ?? []) as Row[];
      }
    }

    const doneLessonIds = new Set(
      (progress ?? []).filter((p: Row) => p.completed).map((p: Row) => p.lesson_id as string),
    );
    const modulesDone = modules.filter((m) => {
      const own = lessons.filter((l) => l.module_id === m.id);
      return own.length > 0 && own.every((l) => doneLessonIds.has(l.id as string));
    }).length;

    // Next action = first incomplete lesson in module order
    let nextLesson: { lessonId: string; lessonTitle: string; moduleTitle: string; courseSlug: string } | null = null;
    for (const m of modules) {
      const own = lessons.filter((l) => l.module_id === m.id);
      const target = own.find((l) => !doneLessonIds.has(l.id as string));
      if (target) {
        const course = (enrollments ?? []).find((e: Row) => e.course_id === m.course_id) as Row | undefined;
        nextLesson = {
          lessonId: target.id as string,
          lessonTitle: target.title as string,
          moduleTitle: m.title as string,
          courseSlug: (course?.academy_courses?.slug as string) ?? "",
        };
        break;
      }
    }

    const scored = (attempts ?? []).filter((a: Row) => a.score != null);
    const practiceScore = scored.length
      ? Math.round(scored.reduce((s: number, a: Row) => s + num(a.score), 0) / scored.length)
      : null;

    const [{ data: nextSeminar }, { data: upcomingExams }] = await Promise.all([
      supabase
        .from("academy_seminars")
        .select("id,title,starts_at,mode,location")
        .eq("is_published", true)
        .gt("starts_at", nowIso)
        .order("starts_at")
        .limit(1),
      supabase
        .from("academy_exams")
        .select("id,title,duration_minutes,available_from,available_until,pass_score")
        .eq("is_published", true)
        .order("available_from", { ascending: true, nullsFirst: false })
        .limit(3),
    ]);

    // Recent activity feed
    const recentLessonIds = (progress ?? []).slice(0, 5).map((p: Row) => p.lesson_id as string);
    let recentLessonTitles: Row[] = [];
    if (recentLessonIds.length) {
      const { data } = await supabase
        .from("academy_lessons")
        .select("id,title")
        .in("id", recentLessonIds);
      recentLessonTitles = (data ?? []) as Row[];
    }
    const activity = [
      ...(progress ?? []).slice(0, 5).map((p: Row) => ({
        at: p.updated_at as string,
        text: `${p.completed ? "Completed" : "Studied"} ${
          recentLessonTitles.find((l) => l.id === p.lesson_id)?.title ?? "a lesson"
        }`,
      })),
      ...(attempts ?? []).slice(0, 5).map((a: Row) => ({
        at: (a.submitted_at ?? a.started_at) as string,
        text: a.score != null ? `Exam attempt scored ${a.score}%` : "Started an exam attempt",
      })),
      ...(certs ?? []).map((c: Row) => ({
        at: c.issued_at as string,
        text: `Certificate issued: ${c.title}`,
      })),
    ]
      .filter((a) => a.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);

    const overall = (enrollments ?? []).length
      ? Math.round(
          (enrollments ?? []).reduce((s: number, e: Row) => s + num(e.progress_pct), 0) /
            (enrollments ?? []).length,
        )
      : 0;

    return {
      overall,
      modulesDone,
      modulesTotal: modules.length,
      practiceScore,
      nextSeminar: (nextSeminar?.[0] as Row) ?? null,
      nextLesson,
      courses: (enrollments ?? []).map((e: Row) => ({
        id: e.id as string,
        title: (e.academy_courses?.title as string) ?? "Course",
        slug: (e.academy_courses?.slug as string) ?? "",
        progress: num(e.progress_pct),
      })),
      upcomingExams: (upcomingExams ?? []) as Row[],
      activity,
    };
  });
}

// ── Licensed arbiter ────────────────────────────────────────────────
const TITLE_ORDER = ["NA", "FA", "IA"] as const;
const NEXT: Record<string, string | null> = { NA: "FA", FA: "IA", IA: null };

export async function buildArbiterDashboard(supabase: SB, userId: string) {
  return cached(`arbiter:${userId}`, async () => {
    const nowIso = new Date().toISOString();
    const [
      { data: licenses },
      { data: cpd },
      { data: requirement },
      { data: attempts },
      { data: certs },
      { data: arbiter },
      { data: updates },
    ] = await Promise.all([
      supabase
        .from("academy_licenses")
        .select("license_number,title,status,issued_at,expires_at")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false }),
      supabase
        .from("academy_cpd_records")
        .select("points,status,activity_date,period,description")
        .eq("user_id", userId),
      supabase
        .from("academy_cpd_requirements")
        .select("title,annual_points_required,cycle_years")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("academy_exam_attempts").select("id,passed,status").eq("user_id", userId),
      supabase.from("academy_certificates").select("id").eq("user_id", userId),
      supabase.from("arbiters").select("title").eq("id", userId).maybeSingle(),
      supabase
        .from("academy_resources")
        .select("id,title,created_at")
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const license = ((licenses ?? []).find((l: Row) => l.status === "active") ??
      (licenses ?? [])[0] ??
      null) as Row | null;

    const approved = (cpd ?? []).filter((r: Row) => r.status === "approved");
    const cpdPoints = approved.reduce((s: number, r: Row) => s + num(r.points), 0);
    const req = (requirement?.[0] as Row) ?? null;
    const cycleYears = num(req?.cycle_years) || 3;
    const cpdTarget = (num(req?.annual_points_required) || 17) * cycleYears || 50;

    const passedExams = (attempts ?? []).filter((a: Row) => a.passed).length;
    const pendingExams = (attempts ?? []).filter((a: Row) => a.status === "in_progress" || a.status === "needs_grading").length;

    const rawTitle = String((arbiter as Row | null)?.title ?? "").toUpperCase();
    const current = (TITLE_ORDER as readonly string[]).includes(rawTitle) ? rawTitle : null;
    const nextTitle = current ? NEXT[current] : "NA";

    const criteria: { label: string; ok: boolean; detail: string }[] = (() => {
      switch (nextTitle) {
        case "NA":
          return [
            { label: "Pass at least 1 exam", ok: passedExams >= 1, detail: `${passedExams} passed` },
            { label: "Earn at least 1 certificate", ok: (certs ?? []).length >= 1, detail: `${(certs ?? []).length} issued` },
          ];
        case "FA":
          return [
            { label: "Hold an active NCAA license", ok: license?.status === "active", detail: license?.status ?? "None" },
            { label: "Pass at least 2 exams", ok: passedExams >= 2, detail: `${passedExams}/2` },
            { label: "Earn 10 approved CPD points", ok: cpdPoints >= 10, detail: `${cpdPoints}/10` },
          ];
        case "IA":
          return [
            { label: "Hold an active NCAA license", ok: license?.status === "active", detail: license?.status ?? "None" },
            { label: "Pass at least 4 exams", ok: passedExams >= 4, detail: `${passedExams}/4` },
            { label: "Earn 30 approved CPD points", ok: cpdPoints >= 30, detail: `${cpdPoints}/30` },
          ];
        default:
          return [];
      }
    })();
    const readiness = criteria.length
      ? Math.round((criteria.filter((c) => c.ok).length / criteria.length) * 100)
      : 100;

    const pendingTasks = [
      ...criteria.filter((c) => !c.ok).map((c) => c.label),
      ...(cpdPoints < cpdTarget ? [`Log ${cpdTarget - cpdPoints} more CPD points`] : []),
      ...((license?.expires_at && new Date(license.expires_at).getTime() - Date.now() < 90 * 86_400_000)
        ? ["Renew your NCAA license"]
        : []),
    ].slice(0, 6);

    void nowIso;
    return {
      license,
      cpdPoints,
      cpdTarget,
      cpdPeriod: (req?.title as string) ?? "Current CPD cycle",
      cpdCount: approved.length,
      pendingExams,
      ruleUpdates: (updates ?? []) as Row[],
      currentTitle: current,
      nextTitle,
      criteria,
      readiness,
      pendingTasks,
    };
  });
}

// ── Instructor ──────────────────────────────────────────────────────
export async function buildInstructorDashboard(supabase: SB, userId: string) {
  return cached(`instructor:${userId}`, async () => {
    const { data: courses } = await supabase
      .from("academy_courses")
      .select("id,title,level,is_published,updated_at")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false });

    const courseIds = (courses ?? []).map((c: Row) => c.id as string);
    let enrollments: Row[] = [];
    if (courseIds.length) {
      const { data } = await supabase
        .from("academy_enrollments")
        .select("course_id,progress_pct,user_id")
        .in("course_id", courseIds);
      enrollments = (data ?? []) as Row[];
    }

    const [{ data: grading }, { data: seminars }, { data: attempts }] = await Promise.all([
      supabase
        .from("academy_exam_attempts")
        .select("id,exam_id,user_id,submitted_at,status")
        .eq("status", "needs_grading")
        .order("submitted_at", { ascending: true })
        .limit(10),
      supabase
        .from("academy_seminars")
        .select("id,title,starts_at,mode,location,capacity")
        .eq("instructor_id", userId)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(5),
      supabase.from("academy_exam_attempts").select("passed,status").not("submitted_at", "is", null).limit(1000),
    ]);

    const graded = (attempts ?? []).filter((a: Row) => a.status === "graded");
    const passRate = graded.length
      ? Math.round((graded.filter((a: Row) => a.passed).length / graded.length) * 100)
      : null;

    const courseRows = (courses ?? []).map((c: Row) => {
      const own = enrollments.filter((e) => e.course_id === c.id);
      return {
        id: c.id as string,
        title: c.title as string,
        level: c.level as string,
        published: !!c.is_published,
        updated_at: c.updated_at as string,
        enrolled: own.length,
        avgCompletion: own.length
          ? Math.round(own.reduce((s, e) => s + num(e.progress_pct), 0) / own.length)
          : 0,
      };
    });

    return {
      courseCount: courseRows.filter((c) => c.published).length,
      students: new Set(enrollments.map((e) => e.user_id as string)).size,
      pendingGrading: (grading ?? []).length,
      passRate,
      courses: courseRows,
      gradingQueue: (grading ?? []) as Row[],
      seminars: (seminars ?? []) as Row[],
    };
  });
}

// ── Admin ───────────────────────────────────────────────────────────
export async function buildAdminDashboard(supabase: SB, userId: string) {
  const { data: isAdmin } = await (
    supabase as unknown as { rpc: (n: string, a: unknown) => Promise<{ data: boolean | null }> }
  ).rpc("academy_is_admin", { _user_id: userId });
  if (!isAdmin) throw new Error("Admin required");

  return cached("admin:overview", async () => {
    const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

    const [users, licensesActive, examsToday, certs, pendingGrading, pendingCpd, pendingPromo] =
      await Promise.all([
        supabase.from("arbiters").select("id", { count: "exact", head: true }),
        supabase.from("academy_licenses").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("academy_exam_attempts").select("id", { count: "exact", head: true }).gte("started_at", dayAgo),
        supabase.from("academy_certificates").select("id", { count: "exact", head: true }),
        supabase.from("academy_exam_attempts").select("id", { count: "exact", head: true }).eq("status", "needs_grading"),
        supabase.from("academy_cpd_records").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("academy_promotion_applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      ]);

    const [{ data: week }, { data: cpdRows }, { data: recent }, { data: expiring }] = await Promise.all([
      supabase.from("academy_exam_attempts").select("started_at").gte("started_at", sinceIso).limit(2000),
      supabase.from("academy_cpd_records").select("user_id,points,status").eq("status", "approved").limit(5000),
      supabase
        .from("academy_exam_attempts")
        .select("id,user_id,exam_id,score,passed,status,submitted_at")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(8),
      supabase
        .from("academy_licenses")
        .select("id,license_number,user_id,expires_at")
        .eq("status", "active")
        .lte("expires_at", new Date(Date.now() + 60 * 86_400_000).toISOString())
        .order("expires_at")
        .limit(8),
    ]);

    // 7-day attempt series
    const series: { day: string; attempts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      series.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        attempts: (week ?? []).filter((a: Row) => String(a.started_at).slice(0, 10) === key).length,
      });
    }

    // CPD compliance buckets across arbiters with approved records
    const perUser = new Map<string, number>();
    (cpdRows ?? []).forEach((r: Row) => {
      perUser.set(r.user_id as string, (perUser.get(r.user_id as string) ?? 0) + num(r.points));
    });
    const totalUsers = users.count ?? 0;
    const compliant = [...perUser.values()].filter((p) => p >= 50).length;
    const partial = [...perUser.values()].filter((p) => p > 0 && p < 50).length;
    const none = Math.max(0, totalUsers - compliant - partial);
    const cpdCompliance = [
      { name: "Compliant", value: compliant },
      { name: "In progress", value: partial },
      { name: "No records", value: none },
    ];

    return {
      users: totalUsers,
      activeLicenses: licensesActive.count ?? 0,
      examsToday: examsToday.count ?? 0,
      certificates: certs.count ?? 0,
      pendingReviews:
        (pendingGrading.count ?? 0) + (pendingCpd.count ?? 0) + (pendingPromo.count ?? 0),
      pendingGrading: pendingGrading.count ?? 0,
      pendingCpd: pendingCpd.count ?? 0,
      pendingPromotions: pendingPromo.count ?? 0,
      series,
      cpdCompliance,
      recent: (recent ?? []) as Row[],
      expiring: (expiring ?? []) as Row[],
    };
  });
}
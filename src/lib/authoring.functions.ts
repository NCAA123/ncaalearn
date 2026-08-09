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

// ── Fetch full course structure for editing ─────────────────────────
export const getCourseStructure = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) =>
    z.object({ courseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: course, error: cErr } = await supabaseAdmin
      .from("academy_courses")
      .select("id,title,slug,description,level,is_published")
      .eq("id", data.courseId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!course) throw new Error("Course not found");
    const { data: modules } = await supabaseAdmin
      .from("academy_modules")
      .select("id,title,order_index,course_id")
      .eq("course_id", data.courseId)
      .order("order_index");
    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = moduleIds.length
      ? await supabaseAdmin
          .from("academy_lessons")
          .select("id,module_id,title,content_type,order_index,duration_minutes,video_url,pdf_url,body,pgn")
          .in("module_id", moduleIds)
          .order("order_index")
      : { data: [] as any[] };
    return { course, modules: modules ?? [], lessons: lessons ?? [] };
  });

// ── Modules ─────────────────────────────────────────────────────────
export const createModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string; title: string }) =>
    z.object({ courseId: z.string().uuid(), title: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: max } = await supabaseAdmin
      .from("academy_modules")
      .select("order_index")
      .eq("course_id", data.courseId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextIdx = ((max?.order_index as number | undefined) ?? -1) + 1;
    const { data: row, error } = await supabaseAdmin
      .from("academy_modules")
      .insert({ course_id: data.courseId, title: data.title, order_index: nextIdx })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title: string }) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_modules")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    // Delete lessons under module first
    await supabaseAdmin.from("academy_lessons").delete().eq("module_id", data.id);
    const { error } = await supabaseAdmin.from("academy_modules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Lessons ─────────────────────────────────────────────────────────
const lessonInput = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content_type: z.enum(["text", "video", "pdf", "pgn", "chess", "quiz"]).default("text"),
  duration_minutes: z.number().int().min(0).max(600).nullable().optional(),
  video_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  pdf_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  body: z.string().max(50000).nullable().optional(),
  pgn: z.string().max(20000).nullable().optional(),
});

export const upsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lessonInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("academy_lessons")
        .update({
          title: data.title,
          content_type: data.content_type,
          duration_minutes: data.duration_minutes ?? null,
          video_url: data.video_url ?? null,
          pdf_url: data.pdf_url ?? null,
          body: data.body ?? null,
          pgn: data.pgn ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: max } = await supabaseAdmin
      .from("academy_lessons")
      .select("order_index")
      .eq("module_id", data.module_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextIdx = ((max?.order_index as number | undefined) ?? -1) + 1;
    const { data: row, error } = await supabaseAdmin
      .from("academy_lessons")
      .insert({
        module_id: data.module_id,
        title: data.title,
        content_type: data.content_type,
        order_index: nextIdx,
        duration_minutes: data.duration_minutes ?? null,
        video_url: data.video_url ?? null,
        pdf_url: data.pdf_url ?? null,
        body: data.body ?? null,
        pgn: data.pgn ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("academy_lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Course settings ─────────────────────────────────────────────────
const settingsInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  short_description: z.string().max(200).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  level: z.string().max(60).nullable().optional(),
  topics: z.array(z.string().max(60)).max(20).default([]),
  tags: z.array(z.string().max(40)).max(30).default([]),
  learning_outcomes: z.array(z.string().max(200)).max(20).default([]),
  prerequisites: z.array(z.string().uuid()).max(10).default([]),
  preview_video_url: z.string().max(500).nullable().optional(),
  target_audience: z.array(z.string().max(60)).max(10).default([]),
  cover_url: z.string().max(500).nullable().optional(),
  duration_minutes: z.number().int().min(0).max(100000).nullable().optional(),
  cpd_points: z.number().int().min(0).max(20).default(0),
  is_mandatory: z.boolean().default(false),
  mandatory_roles: z.array(z.string().max(60)).max(10).default([]),
  pass_mark: z.number().int().min(0).max(100).default(70),
  certificate_eligible: z.boolean().default(true),
  publish_at: z.string().nullable().optional(),
});

export const updateCourseSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("academy_courses")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Duplicate / version ─────────────────────────────────────────────
async function cloneCourse(courseId: string, opts: { asVersion: boolean; userId: string }) {
  const { data: course, error } = await supabaseAdmin
    .from("academy_courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) throw new Error("Course not found");

  const { id: _oldId, created_at: _c, updated_at: _u, ...base } = course as Record<string, unknown>;
  const suffix = opts.asVersion
    ? `-v${((course as any).version ?? 1) + 1}`
    : `-copy-${Date.now().toString(36)}`;
  const newRow = {
    ...base,
    title: opts.asVersion
      ? `${(course as any).title} (v${((course as any).version ?? 1) + 1})`
      : `${(course as any).title} (copy)`,
    slug: `${(course as any).slug}${suffix}`.slice(0, 120),
    is_published: false,
    created_by: opts.userId,
    version: opts.asVersion ? ((course as any).version ?? 1) + 1 : 1,
    parent_course_id: opts.asVersion ? courseId : null,
  };
  const { data: created, error: insErr } = await supabaseAdmin
    .from("academy_courses")
    .insert(newRow as never)
    .select("id,slug")
    .single();
  if (insErr) throw new Error(insErr.message);

  const { data: modules } = await supabaseAdmin
    .from("academy_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");

  for (const m of modules ?? []) {
    const { data: newMod, error: mErr } = await supabaseAdmin
      .from("academy_modules")
      .insert({ course_id: created.id, title: (m as any).title, order_index: (m as any).order_index })
      .select("id")
      .single();
    if (mErr) throw new Error(mErr.message);
    const { data: lessons } = await supabaseAdmin
      .from("academy_lessons")
      .select("*")
      .eq("module_id", (m as any).id)
      .order("order_index");
    if ((lessons ?? []).length) {
      const rows = (lessons ?? []).map((l: any) => {
        const { id: _lid, created_at: _lc, module_id: _mid, ...lrest } = l;
        return { ...lrest, module_id: newMod.id };
      });
      const { error: lErr } = await supabaseAdmin.from("academy_lessons").insert(rows as never);
      if (lErr) throw new Error(lErr.message);
    }
  }
  return created;
}

export const duplicateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return cloneCourse(data.courseId, { asVersion: false, userId: context.userId });
  });

export const createCourseVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return cloneCourse(data.courseId, { asVersion: true, userId: context.userId });
  });

export const migrateEnrollmentsToVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fromCourseId: string; toCourseId: string }) =>
    z.object({ fromCourseId: z.string().uuid(), toCourseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("academy_enrollments")
      .update({ course_id: data.toCourseId, progress_pct: 0, completed_at: null })
      .eq("course_id", data.fromCourseId)
      .select("user_id");
    if (error) throw new Error(error.message);
    const notes = (rows ?? []).map((r: any) => ({
      user_id: r.user_id,
      title: "Course updated",
      body: "You have been moved to a newer version of a course you are enrolled in.",
    }));
    if (notes.length) await supabaseAdmin.from("academy_notifications").insert(notes as never);
    return { migrated: rows?.length ?? 0 };
  });
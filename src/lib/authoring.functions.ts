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
  content_type: z.enum(["text", "video", "pdf", "pgn"]).default("text"),
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
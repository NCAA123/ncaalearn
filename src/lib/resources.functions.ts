import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "resources";

async function isStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.some((r) => ["instructor", "academy_admin", "super_admin"].includes(r));
}

export const listResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("academy_resources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createResourceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("academy_resources")
      .select("file_url,title")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "Not found");
    // file_url is the storage path within the resources bucket
    const path = row.file_url;
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Failed to sign url");
    // bump download count (best-effort)
    await supabaseAdmin
      .from("academy_resources")
      .update({ download_count: ((row as never as { download_count?: number }).download_count ?? 0) + 1 } as never)
      .eq("id", data.id);
    return { url: signed.signedUrl, title: row.title };
  });

export const createResourceUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filename: string }) =>
    z.object({ filename: z.string().min(1).max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Failed to create upload url");
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      title: string;
      description?: string;
      category?: string;
      access_level?: string;
      file_url: string;
    }) =>
      z
        .object({
          title: z.string().min(1).max(200),
          description: z.string().max(2000).optional(),
          category: z.string().max(80).optional(),
          access_level: z.enum(["public", "candidate", "arbiter", "staff"]).optional(),
          file_url: z.string().min(1).max(500),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const { error } = await supabaseAdmin.from("academy_resources").insert({
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? "general",
      access_level: data.access_level ?? "candidate",
      file_url: data.file_url,
      uploaded_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const { data: row } = await supabaseAdmin
      .from("academy_resources")
      .select("file_url")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.file_url) {
      await supabaseAdmin.storage.from(BUCKET).remove([row.file_url]).catch(() => null);
    }
    const { error } = await supabaseAdmin.from("academy_resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Admin reports ────────────────────────────────────────────────────
export const getAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");

    const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesTotal,
      profilesNew,
      enrollmentsTotal,
      enrollmentsNew,
      attemptsTotal,
      attemptsPassed,
      certsTotal,
      certsNew,
      activeLicenses,
      cpdPending,
      essaysPending,
    ] = await Promise.all([
      supabaseAdmin.from("academy_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("academy_profiles").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
      supabaseAdmin.from("academy_enrollments").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("academy_enrollments").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
      supabaseAdmin.from("academy_exam_attempts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("academy_exam_attempts").select("*", { count: "exact", head: true }).eq("status", "passed"),
      supabaseAdmin.from("academy_certificates").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("academy_certificates").select("*", { count: "exact", head: true }).gte("issued_at", sinceIso),
      supabaseAdmin.from("academy_licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("academy_cpd_records").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("academy_exam_attempts").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    ]);

    // Course enrollments breakdown
    const { data: courses } = await supabaseAdmin
      .from("academy_courses")
      .select("id,title")
      .limit(20);
    const courseStats = await Promise.all(
      (courses ?? []).map(async (c) => {
        const { count } = await supabaseAdmin
          .from("academy_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("course_id", c.id);
        return { id: c.id, title: c.title, enrollments: count ?? 0 };
      }),
    );
    courseStats.sort((a, b) => b.enrollments - a.enrollments);

    const totalAttempts = attemptsTotal.count ?? 0;
    const passRate = totalAttempts > 0 ? Math.round(((attemptsPassed.count ?? 0) / totalAttempts) * 100) : 0;

    return {
      profiles: { total: profilesTotal.count ?? 0, last30: profilesNew.count ?? 0 },
      enrollments: { total: enrollmentsTotal.count ?? 0, last30: enrollmentsNew.count ?? 0 },
      exams: {
        attempts: totalAttempts,
        passed: attemptsPassed.count ?? 0,
        passRate,
        pendingGrading: essaysPending.count ?? 0,
      },
      certificates: { total: certsTotal.count ?? 0, last30: certsNew.count ?? 0 },
      licenses: { active: activeLicenses.count ?? 0 },
      cpd: { pending: cpdPending.count ?? 0 },
      courseStats: courseStats.slice(0, 10),
    };
  });
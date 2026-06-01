import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = [
  "candidate",
  "national_arbiter",
  "fide_arbiter",
  "international_arbiter",
  "instructor",
  "academy_admin",
  "super_admin",
] as const;
const RoleEnum = z.enum(ROLES);

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => r === "academy_admin" || r === "super_admin")) {
    throw new Error("Admin role required");
  }
}

// ── Dashboard overview ────────────────────────────────────────────────
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const tables = [
      "academy_profiles",
      "academy_courses",
      "academy_enrollments",
      "academy_seminars",
      "academy_exams",
      "academy_certificates",
      "academy_announcements",
    ] as const;
    const results = await Promise.all(
      tables.map((t) =>
        supabaseAdmin
          .from(t as never)
          .select("*", { count: "exact", head: true })
          .then((r) => ({ table: t, count: r.count ?? 0 })),
      ),
    );
    return Object.fromEntries(results.map((r) => [r.table, r.count])) as Record<
      (typeof tables)[number],
      number
    >;
  });

// ── Users + roles ────────────────────────────────────────────────────
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: users, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);
    const ids = users.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("academy_profiles").select("id,first_name,last_name,email").in("id", ids),
      supabaseAdmin.from("academy_user_roles").select("user_id,role").in("user_id", ids),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role as string);
      roleMap.set(r.user_id, list);
    });
    return users.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      profile: profileMap.get(u.id) ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: (typeof ROLES)[number]; enabled: boolean }) =>
    z
      .object({ userId: z.string().uuid(), role: RoleEnum, enabled: z.boolean() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("academy_user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("academy_user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Announcements ────────────────────────────────────────────────────
export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; audience?: string }) =>
    z
      .object({
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        audience: z.string().max(50).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_announcements").insert({
      title: data.title,
      body: data.body,
      audience: data.audience ?? "all",
      created_by: context.userId,
      published_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Courses ──────────────────────────────────────────────────────────
export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      title: string;
      slug: string;
      description?: string;
      level?: string;
      is_published?: boolean;
    }) =>
      z
        .object({
          title: z.string().min(1).max(200),
          slug: z
            .string()
            .min(1)
            .max(120)
            .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
          description: z.string().max(2000).optional(),
          level: z.string().max(50).optional(),
          is_published: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_courses").insert({
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      level: data.level ?? "candidate",
      is_published: data.is_published ?? false,
      created_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCoursePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_published: boolean }) =>
    z.object({ id: z.string().uuid(), is_published: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_courses")
      .update({ is_published: data.is_published } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Exams + Questions ────────────────────────────────────────────────
export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      title: string;
      description?: string;
      duration_minutes: number;
      pass_score: number;
      level?: string;
      is_published?: boolean;
    }) =>
      z
        .object({
          title: z.string().min(1).max(200),
          description: z.string().max(2000).optional(),
          duration_minutes: z.number().int().min(1).max(600),
          pass_score: z.number().int().min(0).max(100),
          level: z.string().max(50).optional(),
          is_published: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_exams").insert({
      title: data.title,
      description: data.description ?? null,
      duration_minutes: data.duration_minutes,
      pass_score: data.pass_score,
      level: data.level ?? "na",
      is_published: data.is_published ?? false,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_exams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Certificates ─────────────────────────────────────────────────────
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { user_id: string; title: string }) =>
      z
        .object({
          user_id: z.string().uuid(),
          title: z.string().min(1).max(200),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const hash = crypto.randomUUID().replace(/-/g, "");
    const certNo = `NCAA-${Date.now().toString(36).toUpperCase()}-${hash.slice(0, 6).toUpperCase()}`;
    const { error } = await supabaseAdmin.from("academy_certificates").insert({
      user_id: data.user_id,
      title: data.title,
      certificate_number: certNo,
      verification_hash: hash,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.some((r) => ["instructor", "academy_admin", "super_admin"].includes(r));
}
async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.some((r) => ["academy_admin", "super_admin"].includes(r));
}

// ── Licenses ─────────────────────────────────────────────────────────
export const getMyLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_licenses")
      .select("*")
      .eq("user_id", context.userId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const { data, error } = await supabaseAdmin
      .from("academy_licenses")
      .select("*")
      .order("issued_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((l) => l.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("academy_profiles")
      .select("id,first_name,last_name,email")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (data ?? []).map((l) => ({ ...l, profile: map.get(l.user_id) ?? null }));
  });

export const issueLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { user_id: string; title: string; expires_at?: string }) =>
      z
        .object({
          user_id: z.string().uuid(),
          title: z.string().min(1).max(200),
          expires_at: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin required");
    const num = `NCAA-LIC-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabaseAdmin.from("academy_licenses").insert({
      user_id: data.user_id,
      title: data.title,
      license_number: num,
      status: "active",
      expires_at: data.expires_at ?? null,
    } as never);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("academy_notifications").insert({
      user_id: data.user_id,
      title: "License issued",
      body: `Your ${data.title} license (${num}) is now active.`,
      link: "/license",
    } as never);
    return { ok: true };
  });

export const revokeLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin required");
    const { error } = await supabaseAdmin
      .from("academy_licenses")
      .update({ status: "revoked" } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── CPD ──────────────────────────────────────────────────────────────
export const listMyCpd = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_cpd_records")
      .select("*")
      .eq("user_id", context.userId)
      .order("activity_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addCpdRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      activity_type: string;
      description: string;
      points: number;
      activity_date: string;
      evidence_url?: string;
    }) =>
      z
        .object({
          activity_type: z.string().min(1).max(80),
          description: z.string().min(1).max(2000),
          points: z.number().min(0).max(100),
          activity_date: z.string().min(1).max(20),
          evidence_url: z.string().url().max(500).optional().or(z.literal("")),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const period = data.activity_date.slice(0, 4);
    const { error } = await context.supabase.from("academy_cpd_records").insert({
      user_id: context.userId,
      activity_type: data.activity_type,
      description: data.description,
      points: data.points,
      activity_date: data.activity_date,
      evidence_url: data.evidence_url || null,
      period,
      status: "pending",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPendingCpd = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const { data, error } = await supabaseAdmin
      .from("academy_cpd_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("academy_profiles")
      .select("id,first_name,last_name,email")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (data ?? []).map((c) => ({ ...c, profile: map.get(c.user_id) ?? null }));
  });

export const reviewCpd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; status: "approved" | "rejected"; points?: number }) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["approved", "rejected"]),
          points: z.number().min(0).max(100).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isStaff(context.userId))) throw new Error("Staff required");
    const update: Record<string, unknown> = {
      status: data.status,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (typeof data.points === "number") update.points = data.points;
    const { data: rec, error } = await supabaseAdmin
      .from("academy_cpd_records")
      .update(update as never)
      .eq("id", data.id)
      .select("user_id,description")
      .single();
    if (error) throw new Error(error.message);
    if (rec) {
      await supabaseAdmin.from("academy_notifications").insert({
        user_id: rec.user_id,
        title: `CPD ${data.status}`,
        body: rec.description.slice(0, 200),
        link: "/cpd",
      } as never);
    }
    return { ok: true };
  });

// ── Notifications ────────────────────────────────────────────────────
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("academy_notifications")
      .update({ read: true } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("academy_notifications")
      .update({ read: true } as never)
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
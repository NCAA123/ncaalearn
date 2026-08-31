import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => ["academy_admin", "super_admin"].includes(r))) {
    throw new Error("Admin required");
  }
}

/**
 * A licensed arbiter's mandatory-refresher cycle runs on their license
 * anniversary (TODO.MD section 17.1/17.3): the anniversary of
 * academy_licenses.issued_at, every year. Given `now`, returns the bounds
 * of the cycle `now` currently falls in.
 */
function currentCycle(issuedAt: Date, now: Date) {
  const anniv = new Date(issuedAt);
  anniv.setFullYear(now.getFullYear());
  if (anniv <= now) {
    const dueDate = new Date(anniv);
    dueDate.setFullYear(dueDate.getFullYear() + 1);
    return { cycleStart: anniv, dueDate };
  }
  const cycleStart = new Date(anniv);
  cycleStart.setFullYear(cycleStart.getFullYear() - 1);
  return { cycleStart, dueDate: anniv };
}

type MandatoryCourse = { id: string; title: string; slug: string | null; completed: boolean };

/**
 * Core compliance check, shared by the dashboard banner, CPD-lock
 * enforcement, and license-renewal enforcement so all three always agree.
 * Returns `applicable: false` for anyone without an active license --
 * refreshers are only mandatory for licensed arbiters per the spec.
 */
export async function getComplianceStatusFor(userId: string) {
  const { data: licenses } = await supabaseAdmin
    .from("academy_licenses")
    .select("issued_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("issued_at", { ascending: true })
    .limit(1);

  if (!licenses || licenses.length === 0) {
    return { applicable: false as const };
  }

  const now = new Date();
  const { cycleStart, dueDate } = currentCycle(new Date(licenses[0].issued_at), now);

  const { data: userRoleRows } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const userRoles = (userRoleRows ?? []).map((r) => r.role as string);

  const { data: courses } = await supabaseAdmin
    .from("academy_courses")
    .select("id,title,slug,mandatory_roles")
    .eq("is_mandatory", true)
    .eq("is_published", true);

  const applicableCourses = (courses ?? []).filter(
    (c) => !c.mandatory_roles?.length || c.mandatory_roles.some((r: string) => userRoles.includes(r)),
  );

  let mandatoryCourses: MandatoryCourse[] = [];
  if (applicableCourses.length) {
    const { data: enrollments } = await supabaseAdmin
      .from("academy_enrollments")
      .select("course_id,completed_at")
      .eq("user_id", userId)
      .in("course_id", applicableCourses.map((c) => c.id))
      .gte("completed_at", cycleStart.toISOString());
    const completedIds = new Set((enrollments ?? []).map((e) => e.course_id));
    mandatoryCourses = applicableCourses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      completed: completedIds.has(c.id),
    }));
  }

  const compliant = mandatoryCourses.every((c) => c.completed);
  const { data: overrides } = await supabaseAdmin
    .from("academy_compliance_overrides")
    .select("id,reason,granted_at")
    .eq("user_id", userId)
    .gte("granted_at", cycleStart.toISOString())
    .order("granted_at", { ascending: false })
    .limit(1);
  const overrideActive = !!overrides?.length;

  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
  const overdue = !compliant && daysUntilDue < 0;

  let bannerLevel: "none" | "upcoming" | "warning" | "critical" | "overdue" = "none";
  if (!compliant) {
    if (daysUntilDue < 0) bannerLevel = "overdue";
    else if (daysUntilDue <= 7) bannerLevel = "critical";
    else if (daysUntilDue <= 30) bannerLevel = "warning";
    else if (daysUntilDue <= 90) bannerLevel = "upcoming";
  }

  return {
    applicable: true as const,
    compliant,
    dueDate: dueDate.toISOString(),
    daysUntilDue,
    bannerLevel,
    overrideActive,
    cpdLocked: overdue && !overrideActive,
    renewalBlocked: overdue && !overrideActive,
    courses: mandatoryCourses,
  };
}

export const getMyComplianceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getComplianceStatusFor(context.userId));

export const listNonCompliantArbiters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: licenses } = await supabaseAdmin
      .from("academy_licenses")
      .select("user_id")
      .eq("status", "active");
    const userIds = Array.from(new Set((licenses ?? []).map((l) => l.user_id)));
    const results = await Promise.all(
      userIds.map(async (id) => ({ userId: id, status: await getComplianceStatusFor(id) })),
    );
    const nonCompliant = results.filter((r) => r.status.applicable && !r.status.compliant);
    if (!nonCompliant.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("academy_profiles")
      .select("id,first_name,last_name,email")
      .in(
        "id",
        nonCompliant.map((r) => r.userId),
      );
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return nonCompliant.map((r) => ({
      userId: r.userId,
      profile: profileMap.get(r.userId) ?? null,
      status: r.status,
    }));
  });

export const grantComplianceOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { userId: string; reason: string }) =>
      z.object({ userId: z.string().uuid(), reason: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("academy_compliance_overrides").insert({
      user_id: data.userId,
      reason: data.reason,
      granted_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("academy_notifications").insert({
      user_id: data.userId,
      title: "Compliance hold lifted",
      body: "An administrator has cleared your mandatory-refresher hold for this cycle. Please still complete it when you can.",
      link: "/dashboard",
    });
    return { ok: true };
  });

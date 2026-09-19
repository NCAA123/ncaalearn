import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => ["instructor", "academy_admin", "super_admin"].includes(r))) {
    throw new Error("Staff role required");
  }
  return roles;
}

const idInput = z.object({ id: z.string().uuid() });

// ── Create / update ───────────────────────────────────────────────────
const seminarInput = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  seminar_type: z.string().max(40).default("workshop"),
  mode: z.enum(["online", "in_person", "hybrid"]).default("online"),
  description: z.string().max(20000).nullable().optional(),
  level: z.string().max(60).nullable().optional(),
  lead_instructor_id: z.string().uuid().nullable().optional(),
  co_instructor_ids: z.array(z.string().uuid()).max(20).default([]),
  starts_at: z.string(),
  ends_at: z.string(),
  registration_deadline: z.string().nullable().optional(),
  timezone: z.string().max(60).default("Africa/Lagos"),
  venue_name: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  maps_url: z.string().max(1000).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  platform: z.string().max(60).nullable().optional(),
  meeting_url: z.string().max(1000).nullable().optional(),
  meeting_id: z.string().max(120).nullable().optional(),
  meeting_password: z.string().max(120).nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  waitlist_capacity: z.number().int().min(1).nullable().optional(),
  fee_amount: z.number().min(0).default(0),
  currency: z.string().max(8).default("NGN"),
  sponsored_by: z.string().max(200).nullable().optional(),
  exam_id: z.string().uuid().nullable().optional(),
  cpd_points: z.number().int().min(0).max(50).default(0),
  cpd_category: z.string().max(60).nullable().optional(),
  prerequisites_text: z.string().max(4000).nullable().optional(),
  prerequisite_course_ids: z.array(z.string().uuid()).max(20).default([]),
  eligible_roles: z.array(z.string().max(40)).max(10).default([]),
  banner_url: z.string().max(1000).nullable().optional(),
  min_attendance_percent: z.number().int().min(0).max(100).default(80),
  is_published: z.boolean().default(false),
});

export const saveSeminar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => seminarInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { id, ...rest } = data;
    const row = {
      ...rest,
      instructor_id: rest.lead_instructor_id ?? context.userId,
      updated_at: new Date().toISOString(),
    };
    if (id) {
      const { error } = await supabaseAdmin.from("academy_seminars").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("academy_seminars")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as { id: string }).id };
  });

// ── Registration ──────────────────────────────────────────────────────
export const registerForSeminar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seminarId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: s, error } = await supabaseAdmin
      .from("academy_seminars")
      .select("*")
      .eq("id", data.seminarId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!s) throw new Error("Seminar not found");
    const sem = s as Record<string, any>;

    // Step 1 — prerequisites
    const eligible: string[] = sem.eligible_roles ?? [];
    if (eligible.length > 0) {
      const { data: roles } = await supabaseAdmin
        .from("academy_user_roles")
        .select("role")
        .eq("user_id", userId);
      const mine = (roles ?? []).map((r) => r.role as string);
      if (!mine.some((r) => eligible.includes(r))) {
        throw new Error(`This seminar is restricted to: ${eligible.join(", ")}`);
      }
    }
    const prereqs: string[] = sem.prerequisite_course_ids ?? [];
    if (prereqs.length > 0) {
      const { data: enr } = await supabaseAdmin
        .from("academy_enrollments")
        .select("course_id, completed_at, progress_pct")
        .eq("user_id", userId)
        .in("course_id", prereqs);
      const done = new Set(
        (enr ?? [])
          .filter((e: any) => e.completed_at || (e.progress_pct ?? 0) >= 100)
          .map((e: any) => e.course_id as string),
      );
      const missing = prereqs.filter((c) => !done.has(c));
      if (missing.length > 0) {
        const { data: courses } = await supabaseAdmin
          .from("academy_courses")
          .select("id,title,slug")
          .in("id", missing);
        return {
          ok: false as const,
          reason: "prerequisites" as const,
          missing: (courses ?? []).map((c: any) => ({ id: c.id, title: c.title, slug: c.slug })),
        };
      }
    }

    // Step 2 — availability
    const now = Date.now();
    if (sem.registration_deadline && new Date(sem.registration_deadline).getTime() < now) {
      throw new Error("Registration has closed for this seminar");
    }
    if (new Date(sem.ends_at).getTime() < now) throw new Error("This seminar has already ended");

    const { data: regs } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id,status,user_id")
      .eq("seminar_id", sem.id);
    const all = (regs ?? []) as any[];
    const active = all.filter((r) => r.status === "registered");
    const waiting = all.filter((r) => r.status === "waitlisted");
    const mineRow = all.find((r) => r.user_id === userId);

    const full = !!sem.capacity && active.length >= sem.capacity;
    if (full && sem.waitlist_capacity != null && waiting.length >= sem.waitlist_capacity) {
      throw new Error("This seminar and its waitlist are both full");
    }
    if (full && sem.waitlist_capacity === null && sem.capacity) {
      // no waitlist configured
      throw new Error("This seminar is full");
    }

    const status = full ? "waitlisted" : "registered";
    const feeDue = Number(sem.fee_amount ?? 0) > 0 && status === "registered";
    const patch: Record<string, unknown> = {
      status,
      waitlist_position: full ? waiting.length + 1 : null,
      payment_status: Number(sem.fee_amount ?? 0) > 0 ? (status === "registered" ? "pending" : "deferred") : "not_required",
      confirmed_at: status === "registered" && !feeDue ? new Date().toISOString() : null,
      cancelled_at: null,
    };

    let regId = mineRow?.id as string | undefined;
    if (regId) {
      const { error: uErr } = await supabaseAdmin
        .from("academy_seminar_registrations")
        .update(patch as never)
        .eq("id", regId);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { data: ins, error: iErr } = await supabaseAdmin
        .from("academy_seminar_registrations")
        .insert({ user_id: userId, seminar_id: sem.id, ...patch } as never)
        .select("id")
        .single();
      if (iErr) throw new Error(iErr.message);
      regId = (ins as { id: string }).id;
    }

    return {
      ok: true as const,
      status,
      registrationId: regId,
      paymentRequired: feeDue,
      amount: Number(sem.fee_amount ?? 0),
      currency: sem.currency ?? "NGN",
      waitlistPosition: full ? waiting.length + 1 : null,
    };
  });

export const cancelRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seminarId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reg } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id")
      .eq("seminar_id", data.seminarId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!reg) return { ok: true };
    const { error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), waitlist_position: null } as never)
      .eq("id", (reg as any).id);
    if (error) throw new Error(error.message);
    await promote(data.seminarId);
    return { ok: true };
  });

// Offer the first free spot to the next person on the waitlist.
async function promote(seminarId: string) {
  const { data: sem } = await supabaseAdmin
    .from("academy_seminars")
    .select("capacity, fee_amount")
    .eq("id", seminarId)
    .maybeSingle();
  const capacity = (sem as any)?.capacity as number | null;
  if (!capacity) return;
  const { data: regs } = await supabaseAdmin
    .from("academy_seminar_registrations")
    .select("id,status,user_id,waitlist_position,offer_expires_at")
    .eq("seminar_id", seminarId);
  const all = (regs ?? []) as any[];
  const active = all.filter((r) => r.status === "registered").length;
  const offered = all.filter((r) => r.status === "offered" && r.offer_expires_at && new Date(r.offer_expires_at).getTime() > Date.now());
  // expire stale offers
  for (const r of all.filter((x) => x.status === "offered" && x.offer_expires_at && new Date(x.offer_expires_at).getTime() <= Date.now())) {
    await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", r.id);
  }
  if (active + offered.length >= capacity) return;
  const next = all
    .filter((r) => r.status === "waitlisted")
    .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0))[0];
  if (!next) return;
  const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  await supabaseAdmin
    .from("academy_seminar_registrations")
    .update({ status: "offered", offer_expires_at: expires } as never)
    .eq("id", next.id);
  await supabaseAdmin.from("academy_notifications").insert({
    user_id: next.user_id,
    title: "A seminar spot is available",
    body: "You have 48 hours to confirm your place before it moves to the next person on the waitlist.",
    link: `/seminars/${seminarId}`,
  } as never);
}

export const acceptWaitlistOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seminarId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reg } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id,status,offer_expires_at")
      .eq("seminar_id", data.seminarId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const r = reg as any;
    if (!r || r.status !== "offered") throw new Error("No active offer for you");
    if (r.offer_expires_at && new Date(r.offer_expires_at).getTime() < Date.now()) {
      throw new Error("This offer has expired");
    }
    const { data: sem } = await supabaseAdmin
      .from("academy_seminars")
      .select("fee_amount")
      .eq("id", data.seminarId)
      .maybeSingle();
    const fee = Number((sem as any)?.fee_amount ?? 0);
    const { error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({
        status: "registered",
        waitlist_position: null,
        offer_expires_at: null,
        payment_status: fee > 0 ? "pending" : "not_required",
        confirmed_at: fee > 0 ? null : new Date().toISOString(),
      } as never)
      .eq("id", r.id);
    if (error) throw new Error(error.message);
    return { ok: true, paymentRequired: fee > 0, amount: fee };
  });

// Staff-only manual reconciliation (e.g. an offline bank transfer) -- not a
// self-service path. Real self-service payment goes through
// payments.functions.ts' initiateSeminarPayment, which routes through
// nigarbapp's Paystack pipeline instead of letting the client just declare
// itself paid for any amount it likes.
export const markRegistrationPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ registrationId: z.string().uuid(), reference: z.string().max(120), amount: z.number().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: reg } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id,user_id")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (!reg) throw new Error("Registration not found");
    const { error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({
        payment_status: "paid",
        amount_paid: data.amount,
        payment_reference: data.reference,
        confirmed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.registrationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Participants (staff) ──────────────────────────────────────────────
export const listParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ seminarId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: regs, error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("*")
      .eq("seminar_id", data.seminarId)
      .order("registered_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((regs ?? []).map((r: any) => r.user_id)));
    const names: Record<string, { name: string; email: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("academy_profiles")
        .select("id,first_name,last_name,email")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) {
        names[p.id] = {
          name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || p.id.slice(0, 8),
          email: p.email ?? null,
        };
      }
    }
    return (regs ?? []).map((r: any) => ({ ...r, profile: names[r.user_id] ?? { name: r.user_id.slice(0, 8), email: null } }));
  });

const attendanceInput = z.object({
  registrationId: z.string().uuid(),
  attendance_percent: z.number().min(0).max(100).nullable().optional(),
  attendance_minutes: z.number().int().min(0).nullable().optional(),
  attended: z.boolean().optional(),
  join_time: z.string().nullable().optional(),
  leave_time: z.string().nullable().optional(),
});

async function applyAttendance(row: z.infer<typeof attendanceInput>) {
  const { data: reg } = await supabaseAdmin
    .from("academy_seminar_registrations")
    .select("id,seminar_id,user_id")
    .eq("id", row.registrationId)
    .maybeSingle();
  if (!reg) throw new Error("Registration not found");
  const { data: sem } = await supabaseAdmin
    .from("academy_seminars")
    .select("min_attendance_percent,starts_at,ends_at,cpd_points")
    .eq("id", (reg as any).seminar_id)
    .maybeSingle();
  const minPct = Number((sem as any)?.min_attendance_percent ?? 80);
  const durationMin = Math.max(
    1,
    Math.round((new Date((sem as any).ends_at).getTime() - new Date((sem as any).starts_at).getTime()) / 60000),
  );
  let pct = row.attendance_percent ?? null;
  let minutes = row.attendance_minutes ?? null;
  if (pct == null && row.join_time && row.leave_time) {
    minutes = Math.round((new Date(row.leave_time).getTime() - new Date(row.join_time).getTime()) / 60000);
  }
  if (pct == null && minutes != null) pct = Math.min(100, Math.round((minutes / durationMin) * 1000) / 10);
  const attended = row.attended ?? (pct != null ? pct > 0 : false);
  const unlocked = pct != null ? pct >= minPct : false;
  const { error } = await supabaseAdmin
    .from("academy_seminar_registrations")
    .update({
      attendance_percent: pct,
      attendance_minutes: minutes,
      attended,
      join_time: row.join_time ?? null,
      leave_time: row.leave_time ?? null,
      exam_unlocked: unlocked,
    } as never)
    .eq("id", row.registrationId);
  if (error) throw new Error(error.message);
  if (pct != null && !unlocked) {
    await supabaseAdmin.from("academy_notifications").insert({
      user_id: (reg as any).user_id,
      title: "Attendance below requirement",
      body: `Your attendance was ${pct}%. Minimum required is ${minPct}%. The linked exam remains locked — contact the academy to appeal.`,
      link: `/seminars/${(reg as any).seminar_id}`,
    } as never);
  }
  return { pct, unlocked };
}

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attendanceInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    return applyAttendance(data);
  });

export const importAttendanceCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ seminarId: z.string().uuid(), csv: z.string().max(500000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const rows = data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const header = rows.shift()?.toLowerCase().split(",").map((h) => h.trim()) ?? [];
    const emailIdx = header.findIndex((h) => h.includes("email"));
    const pctIdx = header.findIndex((h) => h.includes("percent") || h.includes("attendance"));
    const minIdx = header.findIndex((h) => h.includes("minute") || h.includes("duration"));
    if (emailIdx === -1) throw new Error("CSV must contain an 'email' column");

    const { data: regs } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id,user_id")
      .eq("seminar_id", data.seminarId);
    const ids = (regs ?? []).map((r: any) => r.user_id);
    const { data: profs } = await supabaseAdmin
      .from("academy_profiles")
      .select("id,email")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byEmail = new Map<string, string>();
    for (const p of (profs ?? []) as any[]) if (p.email) byEmail.set(String(p.email).toLowerCase(), p.id);
    const regByUser = new Map((regs ?? []).map((r: any) => [r.user_id, r.id]));

    let updated = 0;
    const unmatched: string[] = [];
    for (const line of rows) {
      const cols = line.split(",").map((c) => c.trim());
      const email = (cols[emailIdx] ?? "").toLowerCase();
      const userId = byEmail.get(email);
      const regId = userId ? regByUser.get(userId) : undefined;
      if (!regId) {
        unmatched.push(email);
        continue;
      }
      const pct = pctIdx >= 0 ? Number(cols[pctIdx]) : null;
      const mins = minIdx >= 0 ? Number(cols[minIdx]) : null;
      await applyAttendance({
        registrationId: regId as string,
        attendance_percent: Number.isFinite(pct as number) ? (pct as number) : null,
        attendance_minutes: Number.isFinite(mins as number) ? (mins as number) : null,
      });
      updated++;
    }
    return { updated, unmatched };
  });

export const checkInByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ seminarId: z.string().uuid(), token: z.string().trim().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const token = data.token.includes("/") ? data.token.split("/").pop()! : data.token;
    const { data: reg } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("id,user_id,seminar_id,checked_in_at")
      .eq("qr_token", token)
      .maybeSingle();
    if (!reg || (reg as any).seminar_id !== data.seminarId) throw new Error("Invalid check-in code for this seminar");
    const { error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({ checked_in_at: (reg as any).checked_in_at ?? new Date().toISOString(), attended: true, join_time: (reg as any).checked_in_at ?? new Date().toISOString() } as never)
      .eq("id", (reg as any).id);
    if (error) throw new Error(error.message);
    return { ok: true, registrationId: (reg as any).id, alreadyCheckedIn: !!(reg as any).checked_in_at };
  });

export const setExamUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ registrationId: z.string().uuid(), unlocked: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .update({ exam_unlocked: data.unlocked, unlock_override_by: context.userId } as never)
      .eq("id", data.registrationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const messageParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      seminarId: z.string().uuid(),
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(5000),
      audience: z.enum(["all", "registered", "waitlisted"]).default("all"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: regs } = await supabaseAdmin
      .from("academy_seminar_registrations")
      .select("user_id,status")
      .eq("seminar_id", data.seminarId);
    const targets = (regs ?? []).filter((r: any) =>
      r.status !== "cancelled" && (data.audience === "all" || r.status === data.audience),
    );
    if (!targets.length) return { sent: 0 };
    const rows = targets.map((r: any) => ({
      user_id: r.user_id,
      title: data.title,
      body: data.body,
      link: `/seminars/${data.seminarId}`,
    }));
    const { error } = await supabaseAdmin.from("academy_notifications").insert(rows as never);
    if (error) throw new Error(error.message);
    return { sent: rows.length };
  });

// ── Materials ─────────────────────────────────────────────────────────
export const saveMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      seminar_id: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
      file_url: z.string().trim().min(1).max(1000),
      visibility: z.enum(["pre", "post", "public"]).default("pre"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("academy_seminar_materials").update(rest as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabaseAdmin
      .from("academy_seminar_materials")
      .insert({ ...rest, uploaded_by: context.userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin.from("academy_seminar_materials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

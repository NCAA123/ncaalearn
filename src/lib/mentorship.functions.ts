import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { invalidateDashboard } from "./dashboard.server";

// TODO.MD 29.1 -- who can mentor whom, keyed by the mentee's own title.
const MENTOR_ELIGIBLE_FOR: Record<string, string[]> = {
  Candidate: ["FIDE", "International"],
  National: ["FIDE", "International"],
  FIDE: ["International"],
  International: [],
};

const INTERACTION_TYPES = ["message", "meeting", "resource", "feedback", "milestone"] as const;

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin.rpc("academy_is_admin", { _user_id: userId });
  return !!data;
}

type MentorshipRow = {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  goals: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

// ── Mentor opt-in (TODO 29.1) ───────────────────────────────────────────
export const getMyMentorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("academy_mentor_profiles" as never)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

export const setMentorAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { is_available: boolean; specialization?: string }) =>
    z
      .object({ is_available: z.boolean(), specialization: z.string().max(300).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles" as never)
      .select("arbiter_level")
      .eq("id", context.userId)
      .single();
    const level = (profile as { arbiter_level?: string } | null)?.arbiter_level;
    if (data.is_available && level !== "FIDE" && level !== "International") {
      throw new Error("Only FIDE and International Arbiters can offer mentorship");
    }
    const { error } = await supabaseAdmin.from("academy_mentor_profiles" as never).upsert(
      {
        user_id: context.userId,
        is_available: data.is_available,
        specialization: data.specialization || null,
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Browse + request (TODO 29.2 Option A: self-selection) ──────────────
export const listAvailableMentors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles" as never)
      .select("arbiter_level")
      .eq("id", context.userId)
      .single();
    const level = (profile as { arbiter_level?: string } | null)?.arbiter_level ?? "Candidate";
    const eligibleTitles = MENTOR_ELIGIBLE_FOR[level] ?? [];
    if (eligibleTitles.length === 0) return [];

    const { data, error } = await context.supabase
      .from("academy_mentors_public" as never)
      .select("*")
      .in("arbiter_level", eligibleTitles as never);
    if (error) throw new Error(error.message);

    return ((data ?? []) as { user_id: string; max_mentees: number; active_mentee_count: number }[]).filter(
      (m) => m.active_mentee_count < m.max_mentees && m.user_id !== context.userId,
    );
  });

export const requestMentorship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mentorId: string; goals: string }) =>
    z.object({ mentorId: z.string().uuid(), goals: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.mentorId === context.userId) throw new Error("You can't request yourself as a mentor");

    const { data: existing } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("id")
      .eq("mentor_id", data.mentorId)
      .eq("mentee_id", context.userId)
      .in("status", ["pending", "active"]);
    if ((existing ?? []).length > 0) {
      throw new Error("You already have a pending or active mentorship with this mentor");
    }

    const { error } = await supabaseAdmin.from("academy_mentorships" as never).insert({
      mentor_id: data.mentorId,
      mentee_id: context.userId,
      goals: data.goals,
      status: "pending",
    } as never);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("academy_notifications" as never).insert({
      user_id: data.mentorId,
      title: "🤝 New mentorship request",
      body: data.goals.slice(0, 200),
      link: "/mentorship",
    } as never);
    return { ok: true };
  });

export const respondToMentorshipRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; accept: boolean }) =>
    z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("mentor_id,mentee_id,status")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) throw new Error("Mentorship request not found");
    const r = row as { mentor_id: string; mentee_id: string; status: string };
    if (r.mentor_id !== context.userId) throw new Error("Only the mentor can respond to this request");
    if (r.status !== "pending") throw new Error("This request has already been responded to");

    const update: Record<string, unknown> = { status: data.accept ? "active" : "declined" };
    if (data.accept) update.started_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("academy_mentorships" as never).update(update as never).eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("academy_notifications" as never).insert({
      user_id: r.mentee_id,
      title: data.accept ? "✅ Mentorship request accepted" : "Mentorship request declined",
      body: data.accept
        ? "Your mentor accepted your request -- head to Mentorship to get started."
        : "Your mentorship request was declined.",
      link: "/mentorship",
    } as never);
    return { ok: true };
  });

// ── My mentorships (both sides) ─────────────────────────────────────────
export const getMyMentorships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: asMentor }, { data: asMentee }] = await Promise.all([
      supabaseAdmin
        .from("academy_mentorships" as never)
        .select("*")
        .eq("mentor_id", context.userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("academy_mentorships" as never)
        .select("*")
        .eq("mentee_id", context.userId)
        .order("created_at", { ascending: false }),
    ]);
    const mentorRows = (asMentor ?? []) as MentorshipRow[];
    const menteeRows = (asMentee ?? []) as MentorshipRow[];

    const otherIds = new Set<string>();
    mentorRows.forEach((r) => otherIds.add(r.mentee_id));
    menteeRows.forEach((r) => otherIds.add(r.mentor_id));

    const { data: profiles } = otherIds.size
      ? await supabaseAdmin
          .from("profiles" as never)
          .select("id,first_name,last_name,avatar_url,arbiter_level")
          .in("id", [...otherIds])
      : { data: [] as unknown[] };
    const pMap = new Map((profiles ?? []).map((p) => [(p as { id: string }).id, p]));

    return {
      asMentor: mentorRows.map((r) => ({ ...r, counterpart: pMap.get(r.mentee_id) ?? null })),
      asMentee: menteeRows.map((r) => ({ ...r, counterpart: pMap.get(r.mentor_id) ?? null })),
    };
  });

// ── Interaction log (TODO 29.3) ─────────────────────────────────────────
export const listInteractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mentorshipId: string }) => z.object({ mentorshipId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("mentor_id,mentee_id")
      .eq("id", data.mentorshipId)
      .single();
    const row = m as { mentor_id: string; mentee_id: string } | null;
    if (!row || (row.mentor_id !== context.userId && row.mentee_id !== context.userId && !(await isAdmin(context.userId)))) {
      throw new Error("Not authorized");
    }
    const { data: interactions, error } = await supabaseAdmin
      .from("academy_mentorship_interactions" as never)
      .select("*")
      .eq("mentorship_id", data.mentorshipId)
      .order("interaction_date", { ascending: false });
    if (error) throw new Error(error.message);
    return interactions ?? [];
  });

export const logInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mentorshipId: string; type: (typeof INTERACTION_TYPES)[number]; content: string }) =>
    z
      .object({
        mentorshipId: z.string().uuid(),
        type: z.enum(INTERACTION_TYPES),
        content: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: m } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("mentor_id,mentee_id,status")
      .eq("id", data.mentorshipId)
      .single();
    const row = m as { mentor_id: string; mentee_id: string; status: string } | null;
    if (!row || (row.mentor_id !== context.userId && row.mentee_id !== context.userId)) throw new Error("Not authorized");
    if (row.status !== "active") throw new Error("This mentorship is not active");

    const { error } = await supabaseAdmin.from("academy_mentorship_interactions" as never).insert({
      mentorship_id: data.mentorshipId,
      interaction_type: data.type,
      content: data.content,
      logged_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Completion + mentor CPD award (TODO 29.3: 5 pts/mentee, cap 10/period) ─
export const completeMentorship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("mentor_id,mentee_id,status")
      .eq("id", data.id)
      .single();
    const row = m as { mentor_id: string; mentee_id: string; status: string } | null;
    if (!row) throw new Error("Not found");
    const admin = await isAdmin(context.userId);
    if (row.mentor_id !== context.userId && row.mentee_id !== context.userId && !admin) throw new Error("Not authorized");
    if (row.status !== "active") throw new Error("Only an active mentorship can be completed");

    const { error } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .update({ status: "completed", ended_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const period = String(new Date().getFullYear());
    const { data: existingMentorCpd } = await supabaseAdmin
      .from("academy_cpd_records" as never)
      .select("points")
      .eq("user_id", row.mentor_id)
      .eq("activity_type", "mentoring")
      .eq("period", period);
    const earnedSoFar = ((existingMentorCpd ?? []) as { points: number }[]).reduce((s, r) => s + (r.points ?? 0), 0);
    const award = Math.max(0, Math.min(5, 10 - earnedSoFar));
    if (award > 0) {
      await supabaseAdmin.from("academy_cpd_records" as never).insert({
        user_id: row.mentor_id,
        activity_type: "mentoring",
        description: "Completed a mentorship",
        points: award,
        activity_date: new Date().toISOString().slice(0, 10),
        period,
        status: "approved",
      } as never);
    }
    invalidateDashboard(row.mentor_id);
    return { ok: true, cpdAwarded: award };
  });

// ── Admin matching (TODO 29.2 Option B) + oversight ─────────────────────
export const adminMatchMentorship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mentorId: string; menteeId: string; goals?: string }) =>
    z
      .object({ mentorId: z.string().uuid(), menteeId: z.string().uuid(), goals: z.string().max(1000).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin required");
    if (data.mentorId === data.menteeId) throw new Error("Mentor and mentee can't be the same person");

    const { error } = await supabaseAdmin.from("academy_mentorships" as never).insert({
      mentor_id: data.mentorId,
      mentee_id: data.menteeId,
      goals: data.goals || null,
      status: "active",
      started_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("academy_notifications" as never).insert([
      { user_id: data.mentorId, title: "🤝 You've been paired with a mentee", body: "An admin matched you with a new mentee.", link: "/mentorship" },
      { user_id: data.menteeId, title: "🤝 You've been paired with a mentor", body: "An admin matched you with a mentor.", link: "/mentorship" },
    ] as never);
    return { ok: true };
  });

export const listAllMentorships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin required");
    const { data, error } = await supabaseAdmin
      .from("academy_mentorships" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as MentorshipRow[];
    const ids = new Set<string>();
    rows.forEach((r) => { ids.add(r.mentor_id); ids.add(r.mentee_id); });
    const { data: profiles } = ids.size
      ? await supabaseAdmin.from("profiles" as never).select("id,first_name,last_name,email").in("id", [...ids])
      : { data: [] as unknown[] };
    const pMap = new Map((profiles ?? []).map((p) => [(p as { id: string }).id, p]));

    return rows.map((r) => ({ ...r, mentor: pMap.get(r.mentor_id) ?? null, mentee: pMap.get(r.mentee_id) ?? null }));
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invalidateDashboard, invalidateAdminDashboard } from "./dashboard.server";

const TITLE_ORDER = ["NA", "FA", "IA"] as const;
type Title = (typeof TITLE_ORDER)[number];

const NEXT: Record<Title, Title | null> = { NA: "FA", FA: "IA", IA: null };

// `profiles.arbiter_level` (shared, auth-linked) uses full-word values;
// this app's own short codes (NA/FA/IA) are kept internally since the
// promotion-readiness logic below is keyed on them.
const LEVEL_TO_CODE: Record<string, Title> = { National: "NA", FIDE: "FA", International: "IA" };
const CODE_TO_LEVEL: Record<Title, string> = { NA: "National", FA: "FIDE", IA: "International" };

type ReadinessCriterion = { label: string; ok: boolean; detail?: string };

async function isAdmin(supabase: SupabaseClient, userId: string) {
  const { data } = await (supabase as unknown as { rpc: (n: string, a: unknown) => Promise<{ data: boolean | null }> }).rpc("academy_is_admin", { _user_id: userId });
  return !!data;
}


export const getMyPromotionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Pull current level from the shared `profiles` row (not `arbiters` —
    // that table's id never matches a real login; see auth-context.tsx).
    const { data: mainProfile } = await supabase
      .from("profiles" as never)
      .select("arbiter_level")
      .eq("id", userId)
      .maybeSingle();
    const current = LEVEL_TO_CODE[(mainProfile as { arbiter_level?: string } | null)?.arbiter_level ?? ""] ?? null;
    const nextTitle = current ? NEXT[current] : "NA";

    // Gather signals
    const [{ data: licenses }, { data: cpds }, { data: attempts }, { data: certs }, { data: apps }] =
      await Promise.all([
        supabase.from("academy_licenses").select("status,title").eq("user_id", userId),
        supabase.from("academy_cpd_records").select("points,status").eq("user_id", userId).eq("status", "approved"),
        supabase.from("academy_exam_attempts").select("passed").eq("user_id", userId).eq("passed", true),
        supabase.from("academy_certificates").select("id").eq("user_id", userId),
        supabase
          .from("academy_promotion_applications" as never)
          .select("id,to_title,status,submitted_at,decision_notes")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false }),
      ]);

    const activeLicense = (licenses ?? []).find((l) => (l as { status: string }).status === "active");
    const cpdPoints = (cpds ?? []).reduce((s, r) => s + Number((r as { points: number }).points || 0), 0);
    const passedExams = (attempts ?? []).length;
    const certCount = (certs ?? []).length;

    const criteria: ReadinessCriterion[] = nextTitle
      ? (() => {
          switch (nextTitle) {
            case "NA":
              return [
                { label: "Pass at least 1 exam", ok: passedExams >= 1, detail: `${passedExams} passed` },
                { label: "Earn at least 1 certificate", ok: certCount >= 1, detail: `${certCount} issued` },
              ];
            case "FA":
              return [
                { label: "Hold an active NCAA license", ok: !!activeLicense, detail: activeLicense ? "Active" : "None" },
                { label: "Pass at least 2 exams", ok: passedExams >= 2, detail: `${passedExams} passed` },
                { label: "Earn 10 approved CPD points", ok: cpdPoints >= 10, detail: `${cpdPoints}/10` },
              ];
            case "IA":
              return [
                { label: "Hold an active NCAA license", ok: !!activeLicense, detail: activeLicense ? "Active" : "None" },
                { label: "Pass at least 4 exams", ok: passedExams >= 4, detail: `${passedExams} passed` },
                { label: "Earn 30 approved CPD points", ok: cpdPoints >= 30, detail: `${cpdPoints}/30` },
              ];
          }
        })()
      : [];

    return {
      current,
      nextTitle,
      criteria,
      ready: criteria.length > 0 && criteria.every((c) => c.ok),
      applications: (apps ?? []) as {
        id: string;
        to_title: string;
        status: string;
        submitted_at: string;
        decision_notes: string | null;
      }[],
    };
  });

export const submitPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to_title: string; notes?: string }) =>
    z
      .object({
        to_title: z.enum(["NA", "FA", "IA"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mainProfile } = await supabase
      .from("profiles" as never)
      .select("arbiter_level")
      .eq("id", userId)
      .maybeSingle();
    const fromTitle =
      LEVEL_TO_CODE[(mainProfile as { arbiter_level?: string } | null)?.arbiter_level ?? ""] ?? "NONE";
    const { error } = await supabase.from("academy_promotion_applications" as never).insert({
      user_id: userId,
      from_title: fromTitle,
      to_title: data.to_title,
      notes: data.notes ?? null,
      status: "submitted",
    } as never);
    if (error) throw new Error(error.message);
    invalidateAdminDashboard();
    return { ok: true };
  });

export const listPromotionApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase as unknown as SupabaseClient, userId))) throw new Error("Admin required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("academy_promotion_applications" as never)
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { user_id: string }[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("academy_profiles")
      .select("id,first_name,last_name,email")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
  });

export const reviewPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; status: "approved" | "rejected"; decision_notes?: string }) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["approved", "rejected"]),
          decision_notes: z.string().max(2000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase as unknown as SupabaseClient, userId))) throw new Error("Admin required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("academy_promotion_applications" as never)
      .update({
        status: data.status,
        decision_notes: data.decision_notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      } as never)
      .eq("id", data.id)
      .select("user_id,to_title")
      .single();
    if (error) throw new Error(error.message);
    const rec = row as { user_id: string; to_title: string } | null;
    if (rec && data.status === "approved") {
      // Promote on the shared `profiles` row (profiles.id === auth user id)
      // so the change is visible in the main dashboard too — this used to
      // target `arbiters`, whose id never matches a real login, so approved
      // promotions never actually took effect anywhere.
      const level = CODE_TO_LEVEL[rec.to_title as Title];
      if (level) {
        await supabaseAdmin
          .from("profiles" as never)
          .update({ arbiter_level: level } as never)
          .eq("id", rec.user_id);
      }
    }
    if (rec) {
      await supabaseAdmin.from("academy_notifications").insert({
        user_id: rec.user_id,
        title: `Promotion ${data.status}`,
        body:
          data.status === "approved"
            ? `You have been promoted to ${rec.to_title}. Congratulations!`
            : (data.decision_notes ?? "Your promotion application was not approved."),
        link: "/promotions",
      } as never);
      invalidateDashboard(rec.user_id);
    }
    invalidateAdminDashboard();
    return { ok: true };
  });

// ── Badges ───────────────────────────────────────────────────────────
export const listBadgesForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from("academy_badges" as never).select("*"),
      supabase.from("academy_user_badges" as never).select("badge_id,awarded_at").eq("user_id", userId),
    ]);
    const mineMap = new Map(
      ((mine ?? []) as { badge_id: string; awarded_at: string }[]).map((r) => [r.badge_id, r.awarded_at]),
    );
    return ((all ?? []) as { id: string; code: string; name: string; description: string | null; icon: string | null }[]).map(
      (b) => ({ ...b, awarded_at: mineMap.get(b.id) ?? null }),
    );
  });

// Evaluate and award any newly-earned badges for the current user.
export const evaluateMyBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: allBadges }, { data: mine }, { data: enrollments }, { data: passes }, { data: lic }, { data: cpd }] =
      await Promise.all([
        supabase.from("academy_badges" as never).select("id,code"),
        supabase.from("academy_user_badges" as never).select("badge_id").eq("user_id", userId),
        supabase.from("academy_enrollments").select("completed_at").eq("user_id", userId).not("completed_at", "is", null),
        supabase.from("academy_exam_attempts").select("id").eq("user_id", userId).eq("passed", true),
        supabase.from("academy_licenses").select("status").eq("user_id", userId).eq("status", "active"),
        supabase.from("academy_cpd_records").select("points").eq("user_id", userId).eq("status", "approved"),
      ]);
    const badgeByCode = new Map(
      ((allBadges ?? []) as { id: string; code: string }[]).map((b) => [b.code, b.id]),
    );
    const haveIds = new Set(((mine ?? []) as { badge_id: string }[]).map((r) => r.badge_id));
    const points = ((cpd ?? []) as { points: number }[]).reduce((s, r) => s + Number(r.points || 0), 0);

    const targets: string[] = [];
    if ((enrollments ?? []).length >= 1) targets.push("first_course");
    if ((passes ?? []).length >= 1) targets.push("first_exam_pass");
    if ((lic ?? []).length >= 1) targets.push("licensed_arbiter");
    if (points >= 10) targets.push("cpd_10");
    if (points >= 50) targets.push("cpd_50");

    const toInsert = targets
      .map((code) => badgeByCode.get(code))
      .filter((id): id is string => !!id && !haveIds.has(id))
      .map((badge_id) => ({ user_id: userId, badge_id }));

    if (toInsert.length) {
      await supabase.from("academy_user_badges" as never).insert(toInsert as never);
    }
    return { awarded: toInsert.length };
  });

// ── Public arbiter registry (auth-gated per user requirement: no public site) ─
export const listArbiterRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; zone?: string; title?: string } | undefined) =>
    z
      .object({
        q: z.string().max(120).optional(),
        zone: z.string().max(60).optional(),
        title: z.string().max(20).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("arbiter_registry_public" as never)
      .select("*")
      .order("last_name", { ascending: true })
      .limit(500);
    if (data.title) q = q.eq("title", data.title);
    if (data.zone) q = q.eq("zone", data.zone);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let list = (rows ?? []) as {
      license_id: string;
      license_number: string;
      title: string;
      first_name: string | null;
      last_name: string | null;
      state: string | null;
      zone: string | null;
      fide_id: string | null;
      avatar_url: string | null;
      issued_at: string;
      expires_at: string | null;
    }[];
    if (data.q) {
      const needle = data.q.toLowerCase();
      list = list.filter((r) =>
        `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.license_number} ${r.fide_id ?? ""}`
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  });
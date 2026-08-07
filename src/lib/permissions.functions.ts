import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Rpc = { rpc: (n: string, a?: unknown) => Promise<{ data: unknown; error: unknown }> };

async function assertAdmin(supabase: unknown, userId: string) {
  const { data } = await (supabase as Rpc).rpc("academy_is_admin", { _user_id: userId });
  if (!data) throw new Error("Admin required");
}

// ── Effective permissions for the signed-in user ─────────────────────
export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as unknown as Rpc).rpc(
      "academy_effective_permissions",
      { _user_id: context.userId },
    );
    if (error) throw new Error((error as { message: string }).message);
    return ((data ?? []) as { permission_key: string }[]).map((r) => r.permission_key);
  });

// ── Catalog + role matrix ────────────────────────────────────────────
export const getPermissionMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: perms }, { data: rolePerms }] = await Promise.all([
      context.supabase
        .from("academy_permissions" as never)
        .select("key,category,description,system_only")
        .order("category")
        .order("key"),
      context.supabase.from("academy_role_permissions" as never).select("role,permission_key"),
    ]);
    return {
      permissions: (perms ?? []) as {
        key: string;
        category: string;
        description: string;
        system_only: boolean;
      }[],
      rolePermissions: (rolePerms ?? []) as { role: string; permission_key: string }[],
    };
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { role: string; permission_key: string; enabled: boolean }) =>
    z
      .object({
        role: z.enum([
          "candidate",
          "national_arbiter",
          "fide_arbiter",
          "international_arbiter",
          "instructor",
          "academy_admin",
          "super_admin",
        ]),
        permission_key: z.string().min(1).max(120),
        enabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("academy_role_permissions" as never)
        .upsert(
          { role: data.role, permission_key: data.permission_key } as never,
          { onConflict: "role,permission_key" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("academy_role_permissions" as never)
        .delete()
        .eq("role", data.role)
        .eq("permission_key", data.permission_key);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ── Per-user overrides ───────────────────────────────────────────────
export const listUserOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId?: string } | undefined) =>
    z.object({ userId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("academy_user_permissions" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.userId) q = q.eq("user_id", data.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as { user_id: string }[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("academy_profiles")
          .select("id,first_name,last_name,email")
          .in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return list.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
  });

export const setUserOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      user_id: string;
      permission_key: string;
      granted: boolean;
      reason?: string;
      expires_at?: string | null;
    }) =>
      z
        .object({
          user_id: z.string().uuid(),
          permission_key: z.string().min(1).max(120),
          granted: z.boolean(),
          reason: z.string().max(500).optional(),
          expires_at: z.string().nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("academy_user_permissions" as never).upsert(
      {
        user_id: data.user_id,
        permission_key: data.permission_key,
        granted: data.granted,
        reason: data.reason ?? null,
        expires_at: data.expires_at || null,
        granted_by: context.userId,
      } as never,
      { onConflict: "user_id,permission_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeUserOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("academy_user_permissions" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Login history ────────────────────────────────────────────────────
function parseDevice(ua: string) {
  if (/iPhone|iPad|Android/i.test(ua)) return "Mobile";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown device";
}

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const ua = req.headers.get("user-agent") ?? "";
    const location = req.headers.get("cf-ipcountry");
    const device = parseDevice(ua);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: past } = await supabaseAdmin
      .from("academy_login_history" as never)
      .select("ip_address,device,location")
      .eq("user_id", context.userId)
      .limit(50);

    const history = (past ?? []) as { ip_address: string | null; device: string | null; location: string | null }[];
    let suspicious = false;
    let reason: string | null = null;
    if (history.length) {
      const knownDevice = history.some((h) => h.device === device);
      const knownLocation = !location || history.some((h) => h.location === location);
      if (!knownDevice) { suspicious = true; reason = "New device"; }
      else if (!knownLocation) { suspicious = true; reason = "New location"; }
    }

    await supabaseAdmin.from("academy_login_history" as never).insert({
      user_id: context.userId,
      ip_address: ip,
      user_agent: ua.slice(0, 400),
      device,
      location,
      suspicious,
      reason,
    } as never);

    if (suspicious) {
      await supabaseAdmin.from("academy_notifications").insert({
        user_id: context.userId,
        title: "New sign-in detected",
        body: `${reason} — ${device}${location ? ` (${location})` : ""}. If this wasn't you, change your password immediately.`,
        link: "/security",
      } as never);
    }
    return { suspicious, reason };
  });

export const listMyLoginHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_login_history" as never)
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as {
      id: string;
      ip_address: string | null;
      device: string | null;
      location: string | null;
      suspicious: boolean;
      reason: string | null;
      created_at: string;
    }[];
  });

// ── Two-factor ───────────────────────────────────────────────────────
export const getTwoFactorState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("academy_two_factor" as never)
      .select("enabled,enabled_at,backup_codes")
      .eq("user_id", context.userId)
      .maybeSingle();
    const row = data as { enabled: boolean; enabled_at: string | null; backup_codes: string[] } | null;
    const isAdmin = await (context.supabase as unknown as Rpc)
      .rpc("academy_is_admin", { _user_id: context.userId })
      .then((r) => !!r.data);
    return {
      enabled: !!row?.enabled,
      enabledAt: row?.enabled_at ?? null,
      backupCodesRemaining: (row?.backup_codes ?? []).length,
      required: isAdmin,
    };
  });

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Marks 2FA active for this user and issues 8 single-use backup codes.
// Codes are returned once in plaintext and stored only as SHA-256 hashes.
export const activateTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { factorId: string }) =>
    z.object({ factorId: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const codes = Array.from({ length: 8 }, randomCode);
    const hashed = await Promise.all(codes.map(sha256));
    const { error } = await context.supabase.from("academy_two_factor" as never).upsert(
      {
        user_id: context.userId,
        enabled: true,
        enabled_at: new Date().toISOString(),
        factor_id: data.factorId,
        backup_codes: hashed,
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { codes };
  });

export const deactivateTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("academy_two_factor" as never)
      .update({ enabled: false, factor_id: null, backup_codes: [] } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

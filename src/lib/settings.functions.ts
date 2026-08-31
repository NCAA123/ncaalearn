import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("academy_user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.some((r) => ["academy_admin", "super_admin"].includes(r));
}

// Any signed-in user can read settings (needed to check maintenance_mode
// and show the platform name before we know their role) — RLS enforces
// this same rule at the database level too.
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_settings" as never)
      .select("*")
      .eq("id", true)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      platform_name?: string;
      support_email?: string;
      default_timezone?: string;
      maintenance_mode?: boolean;
      maintenance_message?: string;
      exam_default_duration_minutes?: number;
      exam_default_pass_score?: number;
      exam_default_max_attempts?: number;
      exam_default_cooldown_hours?: number;
    }) =>
      z
        .object({
          platform_name: z.string().min(1).max(120).optional(),
          support_email: z.string().email().max(255).optional(),
          default_timezone: z.string().min(1).max(80).optional(),
          maintenance_mode: z.boolean().optional(),
          maintenance_message: z.string().min(1).max(500).optional(),
          exam_default_duration_minutes: z.number().int().min(1).max(600).optional(),
          exam_default_pass_score: z.number().int().min(1).max(100).optional(),
          exam_default_max_attempts: z.number().int().min(1).max(20).optional(),
          exam_default_cooldown_hours: z.number().int().min(0).max(720).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin required");
    const { error } = await supabaseAdmin
      .from("academy_settings" as never)
      .update({ ...data, updated_by: context.userId } as never)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

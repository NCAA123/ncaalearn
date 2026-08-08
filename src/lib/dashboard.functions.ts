import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCandidateDashboard,
  buildArbiterDashboard,
  buildInstructorDashboard,
  buildAdminDashboard,
} from "./dashboard.server";

export const getCandidateDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildCandidateDashboard(context.supabase, context.userId));

export const getArbiterDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildArbiterDashboard(context.supabase, context.userId));

export const getInstructorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildInstructorDashboard(context.supabase, context.userId));

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildAdminDashboard(context.supabase, context.userId));
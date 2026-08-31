import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCandidateDashboard,
  buildArbiterDashboard,
  buildInstructorDashboard,
  buildAdminDashboard,
  invalidateDashboard,
} from "./dashboard.server";

// Client-side writes (lesson progress, course enrollment) go straight to
// Supabase and never pass through a server function, so they can't call
// invalidateDashboard() directly — this gives them a way to. Fire-and-forget
// from the client right after the write succeeds.
export const touchCandidateDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    invalidateDashboard(context.userId);
    return { ok: true };
  });

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
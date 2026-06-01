import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Idempotent endpoint that ensures the canonical NCAA Academy super-admin
// account exists. Hardcoded — cannot be abused to create arbitrary admins.
const ADMIN_EMAIL = "info@ncaaweb.com.ng";
const ADMIN_PASSWORD = "Ncaa@123";

async function ensureAdmin() {
  // Find user (auth.admin.listUsers doesn't support filter, so paginate)
  let userId: string | null = null;
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (found) { userId = found.id; break; }
    if (data.users.length < 200) break;
    page++;
  }

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: "NCAA", last_name: "Admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user!.id;
  } else {
    // Reset password to match the documented credentials.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
  }

  await supabaseAdmin
    .from("academy_profiles")
    .upsert(
      { id: userId, email: ADMIN_EMAIL, first_name: "NCAA", last_name: "Admin" } as never,
      { onConflict: "id" },
    );

  for (const role of ["academy_admin", "super_admin"] as const) {
    await supabaseAdmin
      .from("academy_user_roles")
      .upsert({ user_id: userId, role } as never, { onConflict: "user_id,role" });
  }

  return { userId, email: ADMIN_EMAIL };
}

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await ensureAdmin();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
      POST: async () => {
        try {
          const result = await ensureAdmin();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
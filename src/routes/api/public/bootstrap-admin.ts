import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// One-time setup endpoint for provisioning the first NCAA Academy admin
// account. Disabled unless BOOTSTRAP_ADMIN_TOKEN is set in the environment,
// and the caller must supply that exact token plus the desired admin
// email/password in the request body — nothing is hardcoded, and an
// existing account's password/roles are never touched by this route.
function unauthorized() {
  return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function ensureAdmin(email: string, password: string) {
  let userId: string | null = null;
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) { userId = found.id; break; }
    if (data.users.length < 200) break;
    page++;
  }

  let created = false;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "NCAA", last_name: "Admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user!.id;
    created = true;
  }

  await supabaseAdmin
    .from("academy_profiles")
    .upsert(
      { id: userId, email, first_name: "NCAA", last_name: "Admin" } as never,
      { onConflict: "id" },
    );

  for (const role of ["academy_admin", "super_admin"] as const) {
    await supabaseAdmin
      .from("academy_user_roles")
      .upsert({ user_id: userId, role } as never, { onConflict: "user_id,role" });
  }

  return { userId, email, created };
}

async function handle(request: Request) {
  const expectedToken = process.env.BOOTSTRAP_ADMIN_TOKEN;
  if (!expectedToken) {
    return Response.json({ ok: false, error: "Bootstrap endpoint is disabled" }, { status: 404 });
  }

  const providedToken = request.headers.get("x-bootstrap-token");
  if (!providedToken || providedToken !== expectedToken) {
    return unauthorized();
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.email || !body.password || body.password.length < 12) {
    return Response.json(
      { ok: false, error: "email and password (min 12 chars) are required" },
      { status: 400 },
    );
  }

  try {
    const result = await ensureAdmin(body.email, body.password);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});

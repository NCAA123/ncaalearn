import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Set in production to the shared parent domain (e.g. ".ncaaweb.com.ng") so the
// auth cookie is readable by every subdomain (app./academy./admin./vote.), giving
// a single sign-on across the NCAA ecosystem. Left unset in local dev, since a
// browser will reject a cookie `domain` that doesn't match the current host.
const cookieDomain = import.meta.env.VITE_COOKIE_DOMAIN || undefined;

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  // Session now lives in a cookie (shared across NCAA subdomains for SSO)
  // instead of localStorage, which was strictly origin-scoped per subdomain
  // and couldn't be shared with the other apps in the ecosystem.
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});


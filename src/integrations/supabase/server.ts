import { createServerClient } from '@supabase/ssr';
import { getCookies, setCookie } from '@tanstack/react-start/server';
import type { Database } from './types';

// Set in production to the shared parent domain (e.g. ".ncaaweb.com.ng") so the
// auth cookie is readable by every subdomain (app./academy./admin./vote.), giving
// a single sign-on across the NCAA ecosystem. Left unset in local dev, since a
// browser will reject a cookie `domain` that doesn't match the current host.
const cookieDomain = import.meta.env.VITE_COOKIE_DOMAIN || process.env.VITE_COOKIE_DOMAIN || undefined;

/**
 * Cookie-bound Supabase client for use inside TanStack Start server
 * functions/middleware. Reads the session from the request's cookies (shared
 * across the NCAA ecosystem's subdomains) instead of a manually-attached
 * Bearer header, and writes refreshed tokens back via TanStack Start's
 * setCookie so the browser's session stays current.
 */
export function createSupabaseServerClient() {
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

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
    cookies: {
      getAll() {
        const cookies = getCookies();
        return Object.entries(cookies).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options as Parameters<typeof setCookie>[2]);
        });
      },
    },
  });
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AcademyRole =
  | "candidate"
  | "national_arbiter"
  | "fide_arbiter"
  | "international_arbiter"
  | "instructor"
  | "academy_admin"
  | "super_admin";

export interface AcademyProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  arbiter_title: string | null;
  zone: string | null;
  state: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  fide_id: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  profile: AcademyProfile | null;
  roles: AcademyRole[];
  hasRole: (role: AcademyRole) => boolean;
  hasAnyRole: (roles: AcademyRole[]) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isLicensedArbiter: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const STAFF: AcademyRole[] = ["instructor", "academy_admin", "super_admin"];
const ADMIN: AcademyRole[] = ["academy_admin", "super_admin"];
const ARBITER: AcademyRole[] = ["national_arbiter", "fide_arbiter", "international_arbiter"];

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AcademyProfile | null>(null);
  const [roles, setRoles] = useState<AcademyRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileAndRoles = async (uid: string) => {
    // Source of truth for identity is `profiles` (profiles.id === auth.users.id,
    // same row the main NCAA dashboard reads/writes). `arbiters` looks like the
    // shared table but isn't: it's a ~150-row legacy registry with its own
    // independent id, essentially never linked to a real login (verified against
    // the live data — 0 of its rows match any auth.users.id by id, only 1 via its
    // optional profiles_id column). Querying it here always returned nothing,
    // silently blanking every member's real title/rank in this app.
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles" as any)
        .select("id,email,first_name,last_name,arbiter_level,fide_id,zone,state,phone,bio,avatar_url,role")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("academy_user_roles").select("role").eq("user_id", uid),
    ]);

    // Effective permissions are computed server-side (role permissions +
    // per-user overrides + admin/super-admin short-circuits).
    supabase
      .rpc("academy_effective_permissions" as never, { _user_id: uid } as never)
      .then(({ data }) =>
        setPermissions(
          ((data ?? []) as { permission_key: string }[]).map((r) => r.permission_key),
        ),
      );

    const mainProfile = p as
      | (Record<string, string | null> & { arbiter_level?: string | null; role?: string | null })
      | null;

    setProfile(
      mainProfile
        ? {
            id: mainProfile.id as string,
            email: mainProfile.email ?? null,
            first_name: mainProfile.first_name ?? null,
            last_name: mainProfile.last_name ?? null,
            arbiter_title: (mainProfile.arbiter_level as string | null) ?? null,
            zone: mainProfile.zone ?? null,
            state: mainProfile.state ?? null,
            phone: mainProfile.phone ?? null,
            bio: mainProfile.bio ?? null,
            avatar_url: mainProfile.avatar_url ?? null,
            fide_id: mainProfile.fide_id ?? null,
          }
        : null,
    );

    // Combine academy-specific roles with implicit roles derived from the
    // shared profile's arbiter level / main-dashboard role so existing users
    // don't start fresh.
    const academyRoles = ((r ?? []) as { role: AcademyRole }[]).map((row) => row.role);
    const derived: AcademyRole[] = [];
    const level = mainProfile?.arbiter_level ?? "";
    if (level === "National") derived.push("national_arbiter");
    else if (level === "FIDE") derived.push("fide_arbiter");
    else if (level === "International") derived.push("international_arbiter");
    const mainRole = (mainProfile?.role ?? "").toLowerCase();
    if (mainRole === "admin" || mainRole === "superadmin") derived.push("academy_admin");
    if (mainRole === "superadmin") derived.push("super_admin");

    const merged = Array.from(new Set([...academyRoles, ...derived]));
    setRoles(merged.length ? merged : ["candidate"]);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfileAndRoles(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
        setPermissions([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfileAndRoles(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    isAuthenticated: !!user,
    isLoading,
    user,
    session,
    profile,
    roles,
    hasRole: (r) => roles.includes(r),
    hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
    isStaff: roles.some((r) => STAFF.includes(r)),
    isAdmin: roles.some((r) => ADMIN.includes(r)),
    isLicensedArbiter: roles.some((r) => ARBITER.includes(r)),
    permissions,
    can: (p) => permissions.includes(p),
    canAny: (ps) => ps.some((p) => permissions.includes(p)),
    refresh: async () => {
      if (user) await loadProfileAndRoles(user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
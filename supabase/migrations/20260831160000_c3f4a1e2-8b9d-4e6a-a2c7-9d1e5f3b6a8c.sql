-- Ecosystem identity sync, part 2.
--
-- profiles.arbiter_level (shared with nigarbapp) is the single source of
-- truth for an arbiter's title. ncaalearn independently keeps two more
-- copies of "what is this person's title": academy_profiles.arbiter_title
-- (read by ~17 files: search, seminars, discussions, certificates, admin
-- user lists, promotions...) and academy_user_roles' four title-shaped
-- rows (candidate/national_arbiter/fide_arbiter/international_arbiter,
-- read by permission checks and the admin Users screen). Neither was ever
-- wired to profiles.arbiter_level, so a promotion approval (which only
-- updates profiles.arbiter_level) never showed up anywhere else in the
-- app, and toggling a title checkbox in Admin -> Users never touched
-- profiles.arbiter_level either.
--
-- Fix: make profiles the source of truth and fan every change out to both
-- mirrors via a trigger. Existing call sites that read academy_profiles or
-- academy_user_roles keep working unmodified.
CREATE OR REPLACE FUNCTION public.academy_sync_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_role public.academy_app_role;
BEGIN
  v_title := CASE NEW.arbiter_level
    WHEN 'National' THEN 'NA'
    WHEN 'FIDE' THEN 'FA'
    WHEN 'International' THEN 'IA'
    ELSE NULL
  END;

  INSERT INTO public.academy_profiles
    (id, email, first_name, last_name, phone, bio, avatar_url, state, zone, fide_id, arbiter_title)
  VALUES
    (NEW.id, NEW.email, NEW.first_name, NEW.last_name, NEW.phone, NEW.bio, NEW.avatar_url, NEW.state, NEW.zone::text, NEW.fide_id, v_title)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    state = EXCLUDED.state,
    zone = EXCLUDED.zone,
    fide_id = EXCLUDED.fide_id,
    arbiter_title = EXCLUDED.arbiter_title,
    updated_at = now();

  v_role := CASE NEW.arbiter_level
    WHEN 'National' THEN 'national_arbiter'::public.academy_app_role
    WHEN 'FIDE' THEN 'fide_arbiter'::public.academy_app_role
    WHEN 'International' THEN 'international_arbiter'::public.academy_app_role
    ELSE 'candidate'::public.academy_app_role
  END;

  DELETE FROM public.academy_user_roles
  WHERE user_id = NEW.id
    AND role IN ('candidate', 'national_arbiter', 'fide_arbiter', 'international_arbiter');

  INSERT INTO public.academy_user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS academy_sync_from_profile_trigger ON public.profiles;
CREATE TRIGGER academy_sync_from_profile_trigger
  AFTER INSERT OR UPDATE OF arbiter_level, first_name, last_name, phone, avatar_url, bio, state, zone, email, fide_id
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.academy_sync_from_profile();

-- Backfill: fire the trigger once for every existing profile so current
-- drift between profiles and the academy_* mirrors is corrected immediately.
UPDATE public.profiles SET arbiter_level = arbiter_level;

-- Fix the public arbiter registry (src/routes/_authenticated/registry.tsx):
-- 1) its "title" filter compared against academy_licenses.title, a freeform
--    label an admin types (e.g. "National Arbiter -- 2026"), which never
--    equals the NA/FA/IA codes the UI filters by. Source the real title
--    from profiles.arbiter_level instead (the license's own text is kept
--    as the new license_title column, unused by the UI today but preserved).
-- 2) it was declared `security_invoker = true`, but academy_licenses and
--    academy_profiles RLS only let a user read their own row (or staff) --
--    so under invoker security this "directory of all arbiters" silently
--    showed each caller only themselves. Drop security_invoker so the view
--    runs as its owner and returns the full curated, non-sensitive column
--    list to every authenticated user as originally intended.
CREATE OR REPLACE VIEW public.arbiter_registry_public
WITH (security_invoker = false) AS
  SELECT
    l.id AS license_id,
    l.license_number,
    CASE pr.arbiter_level
      WHEN 'National' THEN 'NA'
      WHEN 'FIDE' THEN 'FA'
      WHEN 'International' THEN 'IA'
      ELSE NULL
    END AS title,
    l.status,
    l.issued_at,
    l.expires_at,
    p.first_name,
    p.last_name,
    p.state,
    p.zone,
    p.fide_id,
    p.avatar_url,
    l.title AS license_title
  FROM public.academy_licenses l
  JOIN public.academy_profiles p ON p.id = l.user_id
  LEFT JOIN public.profiles pr ON pr.id = l.user_id
  WHERE l.status = 'active';
GRANT SELECT ON public.arbiter_registry_public TO anon, authenticated;

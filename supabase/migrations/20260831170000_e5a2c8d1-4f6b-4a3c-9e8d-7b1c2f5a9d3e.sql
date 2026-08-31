-- Mentorship Program (TODO.MD section 29).
--
-- academy_mentorships and academy_mentorship_interactions already existed
-- (with working RLS) from the original schema generation, but nothing in
-- the app ever wrote to them. This adds the one missing piece: a mentor's
-- opt-in availability (TODO 29.1 -- "Must opt in to mentoring in their
-- profile", "Maximum active mentees: 3 (configurable)"), and a public
-- browsing view so a candidate can see who's available to mentor them.
--
-- Note: academy_mentorships has no INSERT policy for regular users (only
-- admin can insert directly), so the self-request flow (TODO 29.2 Option A)
-- is implemented via a server function using the service role with an
-- explicit application-level check that the caller is the mentee -- not by
-- adding a broader RLS policy here.
CREATE TABLE public.academy_mentor_profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT false,
  specialization text,
  max_mentees smallint NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_mentor_profiles TO authenticated;
GRANT ALL ON public.academy_mentor_profiles TO service_role;
ALTER TABLE public.academy_mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentor profile self or admin"
  ON public.academy_mentor_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.academy_is_admin(auth.uid()));

CREATE TRIGGER academy_mentor_profiles_updated_at
  BEFORE UPDATE ON public.academy_mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

-- Public browsing view: only opted-in FIDE/International arbiters with an
-- active license, with a live count of their current active mentees so the
-- UI can hide anyone already at capacity. Non-invoker (runs as owner) for
-- the same reason as arbiter_registry_public: profiles/academy_licenses RLS
-- only lets a user read their own row, which would otherwise make this
-- "browse available mentors" list show each caller only themselves.
CREATE OR REPLACE VIEW public.academy_mentors_public
WITH (security_invoker = false) AS
  SELECT
    mp.user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.state,
    p.zone,
    p.arbiter_level,
    mp.specialization,
    mp.max_mentees,
    (
      SELECT count(*) FROM public.academy_mentorships m
      WHERE m.mentor_id = mp.user_id AND m.status = 'active'
    ) AS active_mentee_count
  FROM public.academy_mentor_profiles mp
  JOIN public.profiles p ON p.id = mp.user_id
  WHERE mp.is_available = true
    AND p.arbiter_level IN ('FIDE', 'International')
    AND EXISTS (
      SELECT 1 FROM public.academy_licenses l
      WHERE l.user_id = mp.user_id AND l.status = 'active'
    );
GRANT SELECT ON public.academy_mentors_public TO authenticated;

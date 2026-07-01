
CREATE TABLE public.academy_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_badges TO anon, authenticated;
GRANT ALL ON public.academy_badges TO service_role;
ALTER TABLE public.academy_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.academy_badges FOR SELECT USING (true);

CREATE TABLE public.academy_user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.academy_badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, DELETE ON public.academy_user_badges TO authenticated;
GRANT ALL ON public.academy_user_badges TO service_role;
ALTER TABLE public.academy_user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view user badges" ON public.academy_user_badges FOR SELECT USING (true);

CREATE TABLE public.academy_promotion_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_title text NOT NULL,
  to_title text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  notes text,
  decision_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_promotion_applications TO authenticated;
GRANT ALL ON public.academy_promotion_applications TO service_role;
ALTER TABLE public.academy_promotion_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own or admin views promotion apps" ON public.academy_promotion_applications
  FOR SELECT USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()));
CREATE POLICY "Users insert own promotion apps" ON public.academy_promotion_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update promotion apps" ON public.academy_promotion_applications
  FOR UPDATE USING (public.academy_is_admin(auth.uid()));

INSERT INTO public.academy_badges (code, name, description, icon) VALUES
  ('first_course', 'First Course Complete', 'Completed your first course', 'graduation-cap'),
  ('first_exam_pass', 'Exam Passer', 'Passed your first examination', 'award'),
  ('licensed_arbiter', 'Licensed Arbiter', 'Holds an active NCAA license', 'id-card'),
  ('cpd_10', 'CPD Achiever', 'Earned 10 approved CPD points', 'trending-up'),
  ('cpd_50', 'CPD Champion', 'Earned 50 approved CPD points', 'trophy')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE VIEW public.arbiter_registry_public
WITH (security_invoker = true) AS
  SELECT
    l.id AS license_id,
    l.license_number,
    l.title,
    l.status,
    l.issued_at,
    l.expires_at,
    p.first_name,
    p.last_name,
    p.state,
    p.zone,
    p.fide_id,
    p.avatar_url
  FROM public.academy_licenses l
  JOIN public.academy_profiles p ON p.id = l.user_id
  WHERE l.status = 'active';
GRANT SELECT ON public.arbiter_registry_public TO anon, authenticated;

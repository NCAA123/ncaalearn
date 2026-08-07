-- ─────────────────────────────────────────────────────────────
-- Permission catalog
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.academy_permissions (
  key         text PRIMARY KEY,
  category    text NOT NULL,
  description text NOT NULL,
  system_only boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_permissions TO authenticated;
GRANT ALL ON public.academy_permissions TO service_role;
ALTER TABLE public.academy_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm catalog readable" ON public.academy_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm catalog admin write" ON public.academy_permissions
  FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

INSERT INTO public.academy_permissions (key, category, description, system_only) VALUES
  ('courses.view.beginner','courses','View beginner-level courses',false),
  ('courses.view.na','courses','View National Arbiter level courses',false),
  ('courses.view.fa','courses','View FIDE Arbiter level courses',false),
  ('courses.view.ia','courses','View International Arbiter level courses',false),
  ('courses.enroll.free','courses','Enroll in free courses',false),
  ('courses.create','courses','Create new courses',false),
  ('courses.edit.own','courses','Edit own courses',false),
  ('courses.manage','courses','Manage all courses',false),
  ('practice.attempt','exams','Take unlimited practice exams',false),
  ('exams.certification.attempt','exams','Take eligible certification exams',false),
  ('recertification.attempt','exams','Take recertification quizzes',false),
  ('exams.create','exams','Create examinations',false),
  ('exams.grade.assist','exams','Assist with essay grading under supervision',false),
  ('exams.grade.manual','exams','Grade essay responses',false),
  ('exams.manage','exams','Manage all examinations',false),
  ('assessments.manual_grade','exams','Grade manual assessments',false),
  ('questions.create','exams','Create questions',false),
  ('questions.edit.own','exams','Edit own questions',false),
  ('questions.manage','exams','Manage all questions',false),
  ('resources.download.public','resources','Download public resources',false),
  ('resources.download.na','resources','Download NA-level resources',false),
  ('resources.download.fa','resources','Download FA-level resources',false),
  ('resources.download.ia','resources','Download all resources',false),
  ('resources.upload','resources','Upload resources',false),
  ('refresher.access.na','courses','Access NA refresher courses',false),
  ('refresher.access.fa','courses','Access FA refresher courses',false),
  ('seminars.view','seminars','View seminar listings',false),
  ('seminars.register','seminars','Register for seminars',false),
  ('seminars.manage.assigned','seminars','Manage assigned seminars',false),
  ('seminars.manage','seminars','Manage all seminars',false),
  ('content.create.seminar','seminars','Create seminar content',false),
  ('cpd.track','cpd','Access the CPD tracker',false),
  ('cpd.records.create','cpd','Submit CPD activity records',false),
  ('cpd.manage','cpd','Manage CPD requirements and records',false),
  ('licenses.view.own','licenses','View own license',false),
  ('licenses.manage','licenses','Manage all licenses',false),
  ('promotion.track','promotions','View promotion requirements',false),
  ('certifications.recommend','promotions','Recommend certification approvals',false),
  ('certificates.view.own','certificates','View own certificates',false),
  ('certificates.manage','certificates','Issue, revoke and manage certificates',false),
  ('mentoring.mentor','mentorship','Act as a mentor',false),
  ('profile.edit','account','Edit own profile',false),
  ('notifications.manage','account','Manage own notification preferences',false),
  ('users.manage','admin','Manage all users',false),
  ('roles.manage','admin','Manage roles and permissions',false),
  ('reports.view.courses','reports','View course engagement reports',false),
  ('reports.view.exams','reports','View exam performance reports',false),
  ('reports.all','reports','Access all reports',false),
  ('audit.view','admin','View audit logs',false),
  ('system.settings','admin','Manage system settings',false),
  ('system.maintenance','system','Enable maintenance mode',true),
  ('system.migrations','system','Run database migrations',true),
  ('system.backups','system','Manage backups',true),
  ('integrations.manage','system','Manage external integrations',true),
  ('audit.export','system','Export audit logs',true);

-- ─────────────────────────────────────────────────────────────
-- Role → permission mapping
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.academy_role_permissions (
  role           public.academy_app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.academy_permissions(key) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.academy_role_permissions TO authenticated;
GRANT ALL ON public.academy_role_permissions TO service_role;
ALTER TABLE public.academy_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role perms readable" ON public.academy_role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "role perms admin write" ON public.academy_role_permissions
  FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

-- candidate base
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'candidate'::public.academy_app_role, k FROM unnest(ARRAY[
  'courses.view.beginner','courses.enroll.free','practice.attempt',
  'exams.certification.attempt','resources.download.public','seminars.view',
  'seminars.register','profile.edit','certificates.view.own','notifications.manage'
]) k;

-- national_arbiter = candidate + extras
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'national_arbiter'::public.academy_app_role, permission_key
FROM public.academy_role_permissions WHERE role = 'candidate';
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'national_arbiter'::public.academy_app_role, k FROM unnest(ARRAY[
  'courses.view.na','cpd.track','cpd.records.create','recertification.attempt',
  'licenses.view.own','resources.download.na','refresher.access.na','promotion.track'
]) k;

-- fide_arbiter = national_arbiter + extras
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'fide_arbiter'::public.academy_app_role, permission_key
FROM public.academy_role_permissions WHERE role = 'national_arbiter';
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'fide_arbiter'::public.academy_app_role, k FROM unnest(ARRAY[
  'courses.view.fa','resources.download.fa','refresher.access.fa',
  'mentoring.mentor','exams.grade.assist'
]) k;

-- international_arbiter = fide_arbiter + extras
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'international_arbiter'::public.academy_app_role, permission_key
FROM public.academy_role_permissions WHERE role = 'fide_arbiter';
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'international_arbiter'::public.academy_app_role, k FROM unnest(ARRAY[
  'courses.view.ia','resources.download.ia','content.create.seminar',
  'exams.grade.manual','certifications.recommend','assessments.manual_grade'
]) k;

-- instructor
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'instructor'::public.academy_app_role, k FROM unnest(ARRAY[
  'profile.edit','notifications.manage','seminars.view',
  'courses.create','courses.edit.own','exams.create','questions.create',
  'questions.edit.own','seminars.manage.assigned','resources.upload',
  'reports.view.courses','reports.view.exams'
]) k;

-- academy_admin = every non-system permission
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'academy_admin'::public.academy_app_role, key
FROM public.academy_permissions WHERE system_only = false;

-- super_admin = everything
INSERT INTO public.academy_role_permissions (role, permission_key)
SELECT 'super_admin'::public.academy_app_role, key FROM public.academy_permissions;

-- ─────────────────────────────────────────────────────────────
-- Per-user overrides
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.academy_user_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  permission_key text NOT NULL REFERENCES public.academy_permissions(key) ON DELETE CASCADE,
  granted        boolean NOT NULL DEFAULT true,
  reason         text,
  expires_at     timestamptz,
  granted_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);
CREATE INDEX academy_user_permissions_user_idx ON public.academy_user_permissions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_user_permissions TO authenticated;
GRANT ALL ON public.academy_user_permissions TO service_role;
ALTER TABLE public.academy_user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read overrides" ON public.academy_user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_admin(auth.uid()));
CREATE POLICY "admin write overrides" ON public.academy_user_permissions
  FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));
CREATE TRIGGER academy_user_permissions_updated_at
  BEFORE UPDATE ON public.academy_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Permission evaluation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.academy_has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override boolean;
  v_system   boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- 1. super_admin allows everything
  IF EXISTS (SELECT 1 FROM public.academy_user_roles
             WHERE user_id = _user_id AND role = 'super_admin') THEN
    RETURN true;
  END IF;

  SELECT system_only INTO v_system FROM public.academy_permissions WHERE key = _permission;

  -- 2. academy_admin allows all non-system permissions
  IF COALESCE(v_system, false) = false
     AND EXISTS (SELECT 1 FROM public.academy_user_roles
                 WHERE user_id = _user_id AND role = 'academy_admin') THEN
    RETURN true;
  END IF;

  -- 3. direct user override (allow or deny)
  SELECT granted INTO v_override
  FROM public.academy_user_permissions
  WHERE user_id = _user_id AND permission_key = _permission
    AND (expires_at IS NULL OR expires_at > now());
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  -- 4. role permissions
  RETURN EXISTS (
    SELECT 1
    FROM public.academy_user_roles ur
    JOIN public.academy_role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission_key = _permission
  );
END $$;

-- Effective permission list for a user (used by the app on login)
CREATE OR REPLACE FUNCTION public.academy_effective_permissions(_user_id uuid)
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.key
  FROM public.academy_permissions p
  WHERE public.academy_has_permission(_user_id, p.key);
$$;

-- ── Context checks ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.academy_has_active_license(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_licenses
    WHERE user_id = _user_id AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.academy_is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_enrollments
    WHERE user_id = _user_id AND course_id = _course_id
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Login history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.academy_login_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  ip_address  text,
  user_agent  text,
  device      text,
  location    text,
  suspicious  boolean NOT NULL DEFAULT false,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_login_history_user_idx
  ON public.academy_login_history(user_id, created_at DESC);
GRANT SELECT ON public.academy_login_history TO authenticated;
GRANT ALL ON public.academy_login_history TO service_role;
ALTER TABLE public.academy_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin login history" ON public.academy_login_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Two-factor settings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.academy_two_factor (
  user_id       uuid PRIMARY KEY,
  enabled       boolean NOT NULL DEFAULT false,
  enabled_at    timestamptz,
  factor_id     text,
  backup_codes  text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_two_factor TO authenticated;
GRANT ALL ON public.academy_two_factor TO service_role;
ALTER TABLE public.academy_two_factor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own two factor" ON public.academy_two_factor
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER academy_two_factor_updated_at
  BEFORE UPDATE ON public.academy_two_factor
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
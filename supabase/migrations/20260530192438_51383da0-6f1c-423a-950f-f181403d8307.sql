-- ===========================================================================
-- NCAA Academy — Phase 1 foundation schema
-- All academy tables are namespaced with `academy_` to avoid collisions with
-- the existing NCAA main-site tables in this project.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.academy_app_role AS ENUM (
    'candidate',
    'national_arbiter',
    'fide_arbiter',
    'international_arbiter',
    'instructor',
    'academy_admin',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.academy_user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.academy_app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.academy_user_roles TO authenticated;
GRANT ALL ON public.academy_user_roles TO service_role;
ALTER TABLE public.academy_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.academy_has_role(_user_id uuid, _role public.academy_app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.academy_is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_user_roles
    WHERE user_id = _user_id
      AND role IN ('instructor','academy_admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.academy_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_user_roles
    WHERE user_id = _user_id
      AND role IN ('academy_admin','super_admin')
  );
$$;

CREATE POLICY "users read own roles" ON public.academy_user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_admin(auth.uid()));

CREATE POLICY "admins manage roles" ON public.academy_user_roles
  FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  arbiter_title text,           -- 'NA' | 'FA' | 'IA' | NULL
  zone text,
  state text,
  phone text,
  bio text,
  avatar_url text,
  fide_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_profiles TO authenticated;
GRANT ALL ON public.academy_profiles TO service_role;
ALTER TABLE public.academy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles select own or staff"
  ON public.academy_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.academy_is_staff(auth.uid()));

CREATE POLICY "profiles update own"
  ON public.academy_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles admin all"
  ON public.academy_profiles FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.academy_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER academy_profiles_updated_at
  BEFORE UPDATE ON public.academy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

-- new-user trigger: create profile + default candidate role
CREATE OR REPLACE FUNCTION public.academy_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.academy_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.academy_user_roles (user_id, role)
  VALUES (NEW.id, 'candidate'::public.academy_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS academy_on_auth_user_created ON auth.users;
CREATE TRIGGER academy_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.academy_handle_new_user();

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  description text,
  level text NOT NULL DEFAULT 'candidate', -- candidate|na|fa|ia
  cover_url text,
  duration_minutes int DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_courses TO authenticated;
GRANT ALL ON public.academy_courses TO service_role;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses read published or staff" ON public.academy_courses
  FOR SELECT TO authenticated
  USING (is_published OR public.academy_is_staff(auth.uid()));
CREATE POLICY "courses staff write" ON public.academy_courses
  FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid()))
  WITH CHECK (public.academy_is_staff(auth.uid()));
CREATE TRIGGER academy_courses_updated_at
  BEFORE UPDATE ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_modules TO authenticated;
GRANT ALL ON public.academy_modules TO service_role;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules read" ON public.academy_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules staff write" ON public.academy_modules FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'text', -- text|video|pdf|quiz|board
  body text,
  video_url text,
  pdf_url text,
  duration_minutes int DEFAULT 0,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lessons TO authenticated;
GRANT ALL ON public.academy_lessons TO service_role;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons read" ON public.academy_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "lessons staff write" ON public.academy_lessons FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  progress_pct int NOT NULL DEFAULT 0,
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_enrollments TO authenticated;
GRANT ALL ON public.academy_enrollments TO service_role;
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enroll own select" ON public.academy_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));
CREATE POLICY "enroll own insert" ON public.academy_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "enroll own update" ON public.academy_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.academy_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  seconds_spent int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lesson_progress TO authenticated;
GRANT ALL ON public.academy_lesson_progress TO service_role;
ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson progress own" ON public.academy_lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seminars
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_seminars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  mode text NOT NULL DEFAULT 'online', -- online|in_person|hybrid
  level text DEFAULT 'na',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity int,
  location text,
  meeting_url text,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_seminars TO authenticated;
GRANT ALL ON public.academy_seminars TO service_role;
ALTER TABLE public.academy_seminars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seminars read" ON public.academy_seminars FOR SELECT TO authenticated
  USING (is_published OR public.academy_is_staff(auth.uid()));
CREATE POLICY "seminars staff write" ON public.academy_seminars FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));
CREATE TRIGGER academy_seminars_updated_at BEFORE UPDATE ON public.academy_seminars
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

CREATE TABLE public.academy_seminar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id uuid NOT NULL REFERENCES public.academy_seminars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered', -- registered|attended|cancelled|waitlist
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seminar_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_seminar_registrations TO authenticated;
GRANT ALL ON public.academy_seminar_registrations TO service_role;
ALTER TABLE public.academy_seminar_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registrations own select" ON public.academy_seminar_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));
CREATE POLICY "registrations own insert" ON public.academy_seminar_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "registrations own update" ON public.academy_seminar_registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Exams + questions
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'na',
  duration_minutes int NOT NULL DEFAULT 60,
  pass_score int NOT NULL DEFAULT 70,
  available_from timestamptz,
  available_until timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_exams TO authenticated;
GRANT ALL ON public.academy_exams TO service_role;
ALTER TABLE public.academy_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams read" ON public.academy_exams FOR SELECT TO authenticated
  USING (is_published OR public.academy_is_staff(auth.uid()));
CREATE POLICY "exams staff write" ON public.academy_exams FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));
CREATE TRIGGER academy_exams_updated_at BEFORE UPDATE ON public.academy_exams
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

CREATE TABLE public.academy_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.academy_exams(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'mcq', -- mcq|multi|true_false|essay|board|scenario
  question_text text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer jsonb,
  points int NOT NULL DEFAULT 1,
  category text,
  difficulty text DEFAULT 'medium',
  approved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_questions TO authenticated;
GRANT ALL ON public.academy_questions TO service_role;
ALTER TABLE public.academy_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions staff" ON public.academy_questions FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.academy_exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score int,
  passed boolean,
  status text NOT NULL DEFAULT 'in_progress' -- in_progress|submitted|graded|abandoned
);
GRANT SELECT, INSERT, UPDATE ON public.academy_exam_attempts TO authenticated;
GRANT ALL ON public.academy_exam_attempts TO service_role;
ALTER TABLE public.academy_exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts own select" ON public.academy_exam_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));
CREATE POLICY "attempts own insert" ON public.academy_exam_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "attempts own update" ON public.academy_exam_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.academy_exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  answer jsonb,
  is_correct boolean,
  points_awarded numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_exam_answers TO authenticated;
GRANT ALL ON public.academy_exam_answers TO service_role;
ALTER TABLE public.academy_exam_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers via own attempt" ON public.academy_exam_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.academy_exam_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.academy_is_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.academy_exam_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.academy_is_staff(auth.uid()))));

-- ---------------------------------------------------------------------------
-- Certificates / licenses / CPD
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  certificate_number text UNIQUE NOT NULL,
  verification_hash text UNIQUE NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_url text,
  metadata jsonb DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_certificates TO authenticated;
GRANT SELECT ON public.academy_certificates TO anon; -- public verification
GRANT ALL ON public.academy_certificates TO service_role;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs own or verify" ON public.academy_certificates FOR SELECT
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()) OR true); -- verification by hash is public
CREATE POLICY "certs staff write" ON public.academy_certificates FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number text UNIQUE NOT NULL,
  title text NOT NULL, -- NA|FA|IA
  status text NOT NULL DEFAULT 'active', -- active|expired|suspended|revoked
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_licenses TO authenticated;
GRANT ALL ON public.academy_licenses TO service_role;
ALTER TABLE public.academy_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "licenses own select" ON public.academy_licenses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));
CREATE POLICY "licenses staff write" ON public.academy_licenses FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid())) WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TABLE public.academy_cpd_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  points numeric NOT NULL DEFAULT 0,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  evidence_url text,
  period text, -- e.g. '2025-2027'
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cpd_records TO authenticated;
GRANT ALL ON public.academy_cpd_records TO service_role;
ALTER TABLE public.academy_cpd_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd own select" ON public.academy_cpd_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.academy_is_staff(auth.uid()));
CREATE POLICY "cpd own insert" ON public.academy_cpd_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "cpd staff update" ON public.academy_cpd_records FOR UPDATE TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Resources / notifications / announcements
-- ---------------------------------------------------------------------------
CREATE TABLE public.academy_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  file_url text NOT NULL,
  access_level text NOT NULL DEFAULT 'candidate', -- candidate|na|fa|ia|staff
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  download_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_resources TO authenticated;
GRANT ALL ON public.academy_resources TO service_role;
ALTER TABLE public.academy_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources read" ON public.academy_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources staff write" ON public.academy_resources FOR ALL TO authenticated
  USING (public.academy_is_staff(auth.uid())) WITH CHECK (public.academy_is_staff(auth.uid()));

CREATE TABLE public.academy_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.academy_notifications TO authenticated;
GRANT ALL ON public.academy_notifications TO service_role;
ALTER TABLE public.academy_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs own" ON public.academy_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifs own update" ON public.academy_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.academy_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all', -- all|candidate|na|fa|ia|staff
  priority text NOT NULL DEFAULT 'normal',
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_announcements TO authenticated;
GRANT ALL ON public.academy_announcements TO service_role;
ALTER TABLE public.academy_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announce read" ON public.academy_announcements FOR SELECT TO authenticated
  USING (published_at IS NOT NULL OR public.academy_is_staff(auth.uid()));
CREATE POLICY "announce admin" ON public.academy_announcements FOR ALL TO authenticated
  USING (public.academy_is_admin(auth.uid())) WITH CHECK (public.academy_is_admin(auth.uid()));

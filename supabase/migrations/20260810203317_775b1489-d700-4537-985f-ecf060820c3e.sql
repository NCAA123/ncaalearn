-- ── Seminars: extended fields ─────────────────────────────────────────
ALTER TABLE public.academy_seminars
  ADD COLUMN IF NOT EXISTS seminar_type text NOT NULL DEFAULT 'workshop',
  ADD COLUMN IF NOT EXISTS lead_instructor_id uuid,
  ADD COLUMN IF NOT EXISTS co_instructor_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS meeting_id text,
  ADD COLUMN IF NOT EXISTS meeting_password text,
  ADD COLUMN IF NOT EXISTS waitlist_capacity integer,
  ADD COLUMN IF NOT EXISTS fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS sponsored_by text,
  ADD COLUMN IF NOT EXISTS exam_id uuid,
  ADD COLUMN IF NOT EXISTS cpd_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpd_category text,
  ADD COLUMN IF NOT EXISTS prerequisites_text text,
  ADD COLUMN IF NOT EXISTS prerequisite_course_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligible_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS min_attendance_percent integer NOT NULL DEFAULT 80;

-- ── Registrations: payment, waitlist, attendance, exam gate ───────────
ALTER TABLE public.academy_seminar_registrations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS waitlist_position integer,
  ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS join_time timestamptz,
  ADD COLUMN IF NOT EXISTS leave_time timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_minutes integer,
  ADD COLUMN IF NOT EXISTS attendance_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exam_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_override_by uuid,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS academy_seminar_reg_qr_token_idx
  ON public.academy_seminar_registrations (qr_token);

-- ── Materials ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_seminar_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id uuid NOT NULL REFERENCES public.academy_seminars(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  visibility text NOT NULL DEFAULT 'pre',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_seminar_materials TO authenticated;
GRANT ALL ON public.academy_seminar_materials TO service_role;

ALTER TABLE public.academy_seminar_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials readable by participants" ON public.academy_seminar_materials;
CREATE POLICY "materials readable by participants"
ON public.academy_seminar_materials FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR public.academy_is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.academy_seminar_registrations r
    WHERE r.seminar_id = academy_seminar_materials.seminar_id
      AND r.user_id = auth.uid()
      AND r.status <> 'cancelled'
  )
);

DROP POLICY IF EXISTS "staff manage materials" ON public.academy_seminar_materials;
CREATE POLICY "staff manage materials"
ON public.academy_seminar_materials FOR ALL TO authenticated
USING (public.academy_is_staff(auth.uid()))
WITH CHECK (public.academy_is_staff(auth.uid()));

DROP TRIGGER IF EXISTS set_updated_at_seminar_materials ON public.academy_seminar_materials;
CREATE TRIGGER set_updated_at_seminar_materials
BEFORE UPDATE ON public.academy_seminar_materials
FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
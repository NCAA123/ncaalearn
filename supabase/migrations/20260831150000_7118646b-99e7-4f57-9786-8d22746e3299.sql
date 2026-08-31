-- Backs the mandatory-refresher compliance engine (TODO section 17).
-- academy_courses.is_mandatory / mandatory_roles already exist (added
-- 2026-08-09) but were never used by any application code until now.

ALTER TABLE public.academy_licenses
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewed_at timestamptz;

-- An admin-granted waiver: while an override exists for a user granted
-- during their current compliance cycle, CPD locking and license-renewal
-- blocking are lifted for that cycle even if they're overdue.
CREATE TABLE IF NOT EXISTS public.academy_compliance_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_compliance_overrides_user
  ON public.academy_compliance_overrides (user_id, granted_at DESC);

GRANT SELECT ON public.academy_compliance_overrides TO authenticated;
GRANT ALL ON public.academy_compliance_overrides TO service_role;
ALTER TABLE public.academy_compliance_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance overrides read own or admin" ON public.academy_compliance_overrides
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()));
CREATE POLICY "compliance overrides admin write" ON public.academy_compliance_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.academy_is_admin(auth.uid()));

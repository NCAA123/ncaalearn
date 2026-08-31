-- Platform-wide configuration, backing the admin System Settings page
-- (previously a "Coming Soon" placeholder). Singleton row: id is a boolean
-- primary key constrained to true, so only one row can ever exist.
CREATE TABLE IF NOT EXISTS public.academy_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  platform_name text NOT NULL DEFAULT 'NCAA Academy',
  support_email text NOT NULL DEFAULT 'info@ncaaweb.com.ng',
  default_timezone text NOT NULL DEFAULT 'Africa/Lagos',
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'NCAA Academy is undergoing scheduled maintenance. Please check back shortly.',
  exam_default_duration_minutes integer NOT NULL DEFAULT 60,
  exam_default_pass_score integer NOT NULL DEFAULT 70,
  exam_default_max_attempts integer NOT NULL DEFAULT 3,
  exam_default_cooldown_hours integer NOT NULL DEFAULT 24,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.academy_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.academy_settings TO authenticated;
GRANT ALL ON public.academy_settings TO service_role;
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- Every signed-in user can read settings (needed to check maintenance_mode
-- and display platform_name before we know if they're an admin); only
-- admins can write.
CREATE POLICY "settings readable by authenticated" ON public.academy_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings writable by admin" ON public.academy_settings
  FOR UPDATE TO authenticated
  USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TRIGGER academy_settings_set_updated_at
  BEFORE UPDATE ON public.academy_settings
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

ALTER TABLE public.academy_exam_attempts
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS ip_change_count integer NOT NULL DEFAULT 0;
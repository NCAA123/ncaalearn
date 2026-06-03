ALTER TABLE public.academy_exam_attempts
  ADD COLUMN IF NOT EXISTS violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS violation_count integer NOT NULL DEFAULT 0;
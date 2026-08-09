
ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_outcomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prerequisites uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preview_video_url text,
  ADD COLUMN IF NOT EXISTS target_audience text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cpd_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mandatory_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pass_mark integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS certificate_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_course_id uuid REFERENCES public.academy_courses(id) ON DELETE SET NULL;

ALTER TABLE public.academy_enrollments
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

ALTER TABLE public.academy_lesson_progress
  ADD COLUMN IF NOT EXISTS video_position_seconds integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.academy_lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_lesson_notes TO authenticated;
GRANT ALL ON public.academy_lesson_notes TO service_role;
ALTER TABLE public.academy_lesson_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson notes" ON public.academy_lesson_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.academy_course_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_course_bookmarks TO authenticated;
GRANT ALL ON public.academy_course_bookmarks TO service_role;
ALTER TABLE public.academy_course_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own course bookmarks" ON public.academy_course_bookmarks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER academy_lesson_notes_set_updated_at
  BEFORE UPDATE ON public.academy_lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

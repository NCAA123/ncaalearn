-- Backs the Practice Questions system: an append-only log of every
-- question a candidate answers in practice mode, used to compute the
-- practice dashboard's totals, per-category performance, and streak.
CREATE TABLE IF NOT EXISTS public.academy_practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  category text,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_practice_attempts_user_created
  ON public.academy_practice_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_practice_attempts_user_category
  ON public.academy_practice_attempts (user_id, category);

GRANT SELECT, INSERT ON public.academy_practice_attempts TO authenticated;
GRANT ALL ON public.academy_practice_attempts TO service_role;
ALTER TABLE public.academy_practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice attempts owned by user" ON public.academy_practice_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

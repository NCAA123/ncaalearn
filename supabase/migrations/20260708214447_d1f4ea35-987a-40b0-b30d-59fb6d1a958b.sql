
CREATE TABLE public.academy_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.academy_discussions(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX academy_discussions_course_idx ON public.academy_discussions(course_id, created_at DESC);
CREATE INDEX academy_discussions_parent_idx ON public.academy_discussions(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_discussions TO authenticated;
GRANT ALL ON public.academy_discussions TO service_role;

ALTER TABLE public.academy_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read discussions"
  ON public.academy_discussions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can post their own messages"
  ON public.academy_discussions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON public.academy_discussions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.academy_discussions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can moderate discussions"
  ON public.academy_discussions FOR DELETE TO authenticated
  USING (
    public.academy_has_role(auth.uid(), 'instructor'::public.academy_app_role)
    OR public.academy_has_role(auth.uid(), 'academy_admin'::public.academy_app_role)
    OR public.academy_has_role(auth.uid(), 'super_admin'::public.academy_app_role)
  );

CREATE TRIGGER update_academy_discussions_updated_at
  BEFORE UPDATE ON public.academy_discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

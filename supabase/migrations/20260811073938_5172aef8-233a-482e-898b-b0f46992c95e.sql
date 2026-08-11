ALTER TABLE public.academy_exams
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cooldown_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS seminar_id uuid REFERENCES public.academy_seminars(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS require_attendance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prerequisite_exam_id uuid REFERENCES public.academy_exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instructions text;

ALTER TABLE public.academy_questions
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS fide_reference text,
  ADD COLUMN IF NOT EXISTS reference_material text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS fen text,
  ADD COLUMN IF NOT EXISTS pgn text,
  ADD COLUMN IF NOT EXISTS board_instructions text,
  ADD COLUMN IF NOT EXISTS scenario_text text,
  ADD COLUMN IF NOT EXISTS shuffle_options boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_words integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS review_comments text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS times_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS times_answered integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS times_correct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.academy_questions SET status = 'approved' WHERE approved = true AND status = 'draft';

ALTER TABLE public.academy_exam_answers
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.academy_question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, parent)
);

GRANT SELECT ON public.academy_question_categories TO authenticated;
GRANT ALL ON public.academy_question_categories TO service_role;

ALTER TABLE public.academy_question_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read question categories"
  ON public.academy_question_categories FOR SELECT TO authenticated USING (true);

INSERT INTO public.academy_question_categories (name, parent, sort_order) VALUES
  ('Laws of Chess', NULL, 1),
  ('Basic Rules', 'Laws of Chess', 1),
  ('Piece Movement', 'Laws of Chess', 2),
  ('Special Moves', 'Laws of Chess', 3),
  ('Illegal Moves', 'Laws of Chess', 4),
  ('Draw Conditions', 'Laws of Chess', 5),
  ('Touch Move', 'Laws of Chess', 6),
  ('Rapid Chess Rules', NULL, 2),
  ('Blitz Chess Rules', NULL, 3),
  ('Pairings Systems', NULL, 4),
  ('Swiss System', 'Pairings Systems', 1),
  ('Dutch Pairing', 'Pairings Systems', 2),
  ('Round Robin', 'Pairings Systems', 3),
  ('Accelerated Pairings', 'Pairings Systems', 4),
  ('Anti-Cheating', NULL, 5),
  ('Detection Methods', 'Anti-Cheating', 1),
  ('Procedures', 'Anti-Cheating', 2),
  ('Electronics Policy', 'Anti-Cheating', 3),
  ('Reporting', 'Anti-Cheating', 4),
  ('Tournament Regulations', NULL, 6),
  ('Time Controls', 'Tournament Regulations', 1),
  ('Scoring', 'Tournament Regulations', 2),
  ('Tie-breaks', 'Tournament Regulations', 3),
  ('Arbiter Procedures', 'Tournament Regulations', 4),
  ('Appeals Committee', NULL, 7),
  ('Procedure', 'Appeals Committee', 1),
  ('Evidence', 'Appeals Committee', 2),
  ('Rulings', 'Appeals Committee', 3),
  ('Ethics', NULL, 8),
  ('Arbiter Conduct', 'Ethics', 1),
  ('FIDE Ethics Code', 'Ethics', 2),
  ('Conflict of Interest', 'Ethics', 3),
  ('Rating Regulations', NULL, 9),
  ('FIDE Handbook', NULL, 10),
  ('Online Chess', NULL, 11)
ON CONFLICT (name, parent) DO NOTHING;
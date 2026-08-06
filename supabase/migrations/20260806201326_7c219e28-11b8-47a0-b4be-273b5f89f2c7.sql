
-- ============================================================
-- NCAA Academy: Simulations, Promotion Pathway, CPD Framework,
-- Exam Integrity, Mentorship, Audit Log
-- ============================================================

-- ---------- SIMULATIONS ----------
CREATE TABLE public.academy_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,                        -- e.g. 'illegal_move','time_forfeit','conduct'
  difficulty TEXT NOT NULL DEFAULT 'beginner', -- beginner|intermediate|advanced|expert
  estimated_minutes INT NOT NULL DEFAULT 10,
  passing_score INT NOT NULL DEFAULT 70,
  thumbnail_path TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_scenarios TO anon, authenticated;
GRANT ALL ON public.academy_scenarios TO service_role;
ALTER TABLE public.academy_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenarios_read_published" ON public.academy_scenarios
  FOR SELECT USING (is_published = true OR public.academy_is_admin(auth.uid()));
CREATE POLICY "scenarios_admin_write" ON public.academy_scenarios
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TABLE public.academy_scenario_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.academy_scenarios(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  context JSONB,                        -- FEN, PGN, tournament state, etc.
  choices JSONB NOT NULL,               -- [{id,label,is_correct,points,feedback,next_step_id?}]
  points INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, step_order)
);
GRANT SELECT ON public.academy_scenario_steps TO authenticated;
GRANT ALL ON public.academy_scenario_steps TO service_role;
ALTER TABLE public.academy_scenario_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps_read" ON public.academy_scenario_steps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.academy_scenarios s
            WHERE s.id = scenario_id AND (s.is_published OR public.academy_is_admin(auth.uid())))
  );
CREATE POLICY "steps_admin_write" ON public.academy_scenario_steps
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TABLE public.academy_simulation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.academy_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score INT,
  max_score INT,
  passed BOOLEAN,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{step_id,choice_id,points,correct}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_simulation_attempts TO authenticated;
GRANT ALL ON public.academy_simulation_attempts TO service_role;
ALTER TABLE public.academy_simulation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_attempts_own" ON public.academy_simulation_attempts
  FOR ALL USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

-- ---------- PROMOTION PATHWAY ----------
CREATE TABLE public.academy_promotion_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_title TEXT NOT NULL,               -- NA | FA | IA
  code TEXT NOT NULL,                   -- exams_passed | active_license | cpd_points | norms | tournaments
  label TEXT NOT NULL,
  threshold NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (to_title, code)
);
GRANT SELECT ON public.academy_promotion_requirements TO authenticated;
GRANT ALL ON public.academy_promotion_requirements TO service_role;
ALTER TABLE public.academy_promotion_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_req_read" ON public.academy_promotion_requirements
  FOR SELECT USING (true);
CREATE POLICY "promo_req_admin" ON public.academy_promotion_requirements
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TABLE public.academy_norms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  toward_title TEXT NOT NULL,           -- NA | FA | IA
  tournament_name TEXT NOT NULL,
  tournament_date DATE NOT NULL,
  role TEXT,                            -- Chief Arbiter, Deputy, Sector, etc.
  federation TEXT,
  evidence_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending|approved|rejected
  weight NUMERIC NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_norms TO authenticated;
GRANT ALL ON public.academy_norms TO service_role;
ALTER TABLE public.academy_norms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "norms_own_or_admin" ON public.academy_norms
  FOR SELECT USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()));
CREATE POLICY "norms_insert_own" ON public.academy_norms
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "norms_update_admin" ON public.academy_norms
  FOR UPDATE USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

-- ---------- CPD FRAMEWORK ----------
CREATE TABLE public.academy_cpd_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,           -- NA | FA | IA
  annual_points_required INT NOT NULL DEFAULT 0,
  cycle_years INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_cpd_requirements TO authenticated;
GRANT ALL ON public.academy_cpd_requirements TO service_role;
ALTER TABLE public.academy_cpd_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd_req_read" ON public.academy_cpd_requirements
  FOR SELECT USING (true);
CREATE POLICY "cpd_req_admin" ON public.academy_cpd_requirements
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

CREATE TABLE public.academy_cpd_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                        -- seminar|tournament|course|publication|mentoring
  points NUMERIC NOT NULL DEFAULT 0,
  max_per_year NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_cpd_activities TO authenticated;
GRANT ALL ON public.academy_cpd_activities TO service_role;
ALTER TABLE public.academy_cpd_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd_act_read" ON public.academy_cpd_activities
  FOR SELECT USING (is_active OR public.academy_is_admin(auth.uid()));
CREATE POLICY "cpd_act_admin" ON public.academy_cpd_activities
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));

-- ---------- EXAM INTEGRITY ----------
CREATE TABLE public.academy_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  option_order INT NOT NULL,
  content TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_order)
);
GRANT SELECT ON public.academy_question_options TO authenticated;
GRANT ALL ON public.academy_question_options TO service_role;
ALTER TABLE public.academy_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qopts_admin_all" ON public.academy_question_options
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));
CREATE POLICY "qopts_read_authenticated" ON public.academy_question_options
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE public.academy_exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.academy_exam_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,         -- tab_switch|fullscreen_exit|copy|paste|right_click|dev_tools|multiple_faces|no_face|network_drop
  severity TEXT NOT NULL DEFAULT 'low', -- low|medium|high|critical
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.academy_exam_violations TO authenticated;
GRANT ALL ON public.academy_exam_violations TO service_role;
ALTER TABLE public.academy_exam_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "violations_insert_own" ON public.academy_exam_violations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "violations_read_own_or_admin" ON public.academy_exam_violations
  FOR SELECT USING (auth.uid() = user_id OR public.academy_is_admin(auth.uid()));

-- ---------- MENTORSHIP ----------
CREATE TABLE public.academy_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active|completed|paused|cancelled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, mentee_id)
);
GRANT SELECT, INSERT, UPDATE ON public.academy_mentorships TO authenticated;
GRANT ALL ON public.academy_mentorships TO service_role;
ALTER TABLE public.academy_mentorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentorship_participants" ON public.academy_mentorships
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id OR public.academy_is_admin(auth.uid()));
CREATE POLICY "mentorship_admin_write" ON public.academy_mentorships
  FOR ALL USING (public.academy_is_admin(auth.uid()))
  WITH CHECK (public.academy_is_admin(auth.uid()));
CREATE POLICY "mentorship_participants_update" ON public.academy_mentorships
  FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE TABLE public.academy_mentorship_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id UUID NOT NULL REFERENCES public.academy_mentorships(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,       -- message|meeting|resource_shared|feedback|milestone
  content TEXT,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.academy_mentorship_interactions TO authenticated;
GRANT ALL ON public.academy_mentorship_interactions TO service_role;
ALTER TABLE public.academy_mentorship_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mi_participants_read" ON public.academy_mentorship_interactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.academy_mentorships m
            WHERE m.id = mentorship_id
              AND (auth.uid() = m.mentor_id OR auth.uid() = m.mentee_id OR public.academy_is_admin(auth.uid())))
  );
CREATE POLICY "mi_participants_insert" ON public.academy_mentorship_interactions
  FOR INSERT WITH CHECK (
    auth.uid() = logged_by
    AND EXISTS (SELECT 1 FROM public.academy_mentorships m
                WHERE m.id = mentorship_id
                  AND (auth.uid() = m.mentor_id OR auth.uid() = m.mentee_id))
  );

-- ---------- AUDIT LOG ----------
CREATE TABLE public.academy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                 -- e.g. 'promotion.approve','license.issue','exam.grade'
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.academy_audit_log TO authenticated;
GRANT ALL ON public.academy_audit_log TO service_role;
ALTER TABLE public.academy_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.academy_audit_log
  FOR SELECT USING (public.academy_is_admin(auth.uid()));
CREATE POLICY "audit_insert_authenticated" ON public.academy_audit_log
  FOR INSERT WITH CHECK (auth.uid() = actor_id OR public.academy_is_admin(auth.uid()));

-- ---------- updated_at TRIGGERS ----------
CREATE TRIGGER trg_scenarios_updated BEFORE UPDATE ON public.academy_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
CREATE TRIGGER trg_norms_updated BEFORE UPDATE ON public.academy_norms
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
CREATE TRIGGER trg_cpd_req_updated BEFORE UPDATE ON public.academy_cpd_requirements
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
CREATE TRIGGER trg_cpd_act_updated BEFORE UPDATE ON public.academy_cpd_activities
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();
CREATE TRIGGER trg_mentorship_updated BEFORE UPDATE ON public.academy_mentorships
  FOR EACH ROW EXECUTE FUNCTION public.academy_set_updated_at();

-- ---------- INDEXES ----------
CREATE INDEX idx_sim_attempts_user ON public.academy_simulation_attempts(user_id);
CREATE INDEX idx_sim_attempts_scenario ON public.academy_simulation_attempts(scenario_id);
CREATE INDEX idx_norms_user ON public.academy_norms(user_id);
CREATE INDEX idx_norms_status ON public.academy_norms(status);
CREATE INDEX idx_violations_attempt ON public.academy_exam_violations(attempt_id);
CREATE INDEX idx_mi_mentorship ON public.academy_mentorship_interactions(mentorship_id);
CREATE INDEX idx_audit_actor ON public.academy_audit_log(actor_id);
CREATE INDEX idx_audit_resource ON public.academy_audit_log(resource_type, resource_id);

-- ---------- SEED promotion requirements & CPD ----------
INSERT INTO public.academy_promotion_requirements (to_title, code, label, threshold) VALUES
  ('NA','exams_passed','Pass at least 1 arbiter exam',1),
  ('NA','certificates','Earn at least 1 certificate',1),
  ('FA','active_license','Hold an active NCAA license',1),
  ('FA','exams_passed','Pass at least 2 exams',2),
  ('FA','cpd_points','Earn 10 approved CPD points',10),
  ('FA','norms','Achieve 2 FA norms',2),
  ('IA','active_license','Hold an active NCAA license',1),
  ('IA','exams_passed','Pass at least 4 exams',4),
  ('IA','cpd_points','Earn 30 approved CPD points',30),
  ('IA','norms','Achieve 3 IA norms',3)
ON CONFLICT DO NOTHING;

INSERT INTO public.academy_cpd_requirements (title, annual_points_required, cycle_years) VALUES
  ('NA', 10, 1),
  ('FA', 20, 1),
  ('IA', 30, 1)
ON CONFLICT (title) DO NOTHING;

INSERT INTO public.academy_cpd_activities (code, name, category, points, max_per_year) VALUES
  ('seminar_attend','Attend approved seminar','seminar',5,20),
  ('tournament_officiate','Officiate rated tournament','tournament',3,30),
  ('course_complete','Complete academy course','course',4,20),
  ('publication','Publish arbiter article','publication',6,12),
  ('mentoring_hours','Mentor a candidate arbiter','mentoring',2,10)
ON CONFLICT (code) DO NOTHING;

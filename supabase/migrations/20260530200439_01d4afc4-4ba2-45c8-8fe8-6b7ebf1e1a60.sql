
-- =========================================================
-- Admin helper (security definer, no recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_main_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.admins a WHERE a.id::text = _uid::text AND a.is_active = true)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid AND p.role IN ('admin','superadmin'));
$$;

REVOKE EXECUTE ON FUNCTION public.is_main_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_main_admin(uuid) TO authenticated, service_role;

-- =========================================================
-- ARBITERS  (contains password, password_hash, email, phone, address)
-- =========================================================
DROP POLICY IF EXISTS arbiters_select_all   ON public.arbiters;
DROP POLICY IF EXISTS arbiters_insert_any   ON public.arbiters;

-- Keep: arbiters_select_own, arbiters_update_own, arbiters_update_self,
--       admins_select_all_arbiters
-- Add admin-managed insert
CREATE POLICY arbiters_insert_admin
  ON public.arbiters FOR INSERT TO authenticated
  WITH CHECK (public.is_main_admin(auth.uid()));

-- Block direct anon/authenticated access to sensitive columns
REVOKE SELECT (password, password_hash) ON public.arbiters FROM anon, authenticated;

-- Safe public view (no sensitive columns)
DROP VIEW IF EXISTS public.arbiters_public;
CREATE VIEW public.arbiters_public
WITH (security_invoker = on) AS
SELECT id, fide_id, first_name, last_name, title, zone, state, zone_id,
       bio, avatar_url, status, rating, is_active, arbiter_category,
       arbiter_id, role, licensed_status, created_at, updated_at
FROM public.arbiters
WHERE is_active = true;
GRANT SELECT ON public.arbiters_public TO anon, authenticated;

-- =========================================================
-- PROFILES  (RLS was disabled)
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop overly broad policies; keep self-only + admin-all
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all_authenticated ON public.profiles;

-- Replace the recursive admin policy with the helper
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY profiles_select_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

CREATE POLICY profiles_update_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_main_admin(auth.uid()))
  WITH CHECK (public.is_main_admin(auth.uid()));

CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- Safe public view (name/avatar/zone only) for any UI that listed profiles
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, first_name, last_name, avatar_url, zone, arbiter_level, is_active
FROM public.profiles
WHERE is_active = true;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- =========================================================
-- CONTACTS
-- =========================================================
DROP POLICY IF EXISTS contacts_select_admins ON public.contacts;
CREATE POLICY contacts_select_admin
  ON public.contacts FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- =========================================================
-- NEWSLETTER SUBSCRIBERS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view public newsletter status" ON public.newsletter_subscribers;
CREATE POLICY newsletter_select_admin
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- =========================================================
-- PAYSTACK TRANSACTIONS
-- =========================================================
DROP POLICY IF EXISTS "Service role can manage paystack transactions" ON public.paystack_transactions;
CREATE POLICY paystack_service_role_all
  ON public.paystack_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY paystack_admin_select
  ON public.paystack_transactions FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- =========================================================
-- PAYMENTS  (RLS was disabled — existing policies become effective)
-- =========================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- =========================================================
-- GROUP MEMBERS  (RLS was disabled + broken tautology)
-- =========================================================
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;

DROP POLICY IF EXISTS "Users can view group members they are part of" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;

CREATE POLICY group_members_select_same_group
  ON public.group_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY group_members_insert_self
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY group_members_delete_self
  ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY group_members_admin_all
  ON public.group_members FOR ALL TO authenticated
  USING (public.is_main_admin(auth.uid()))
  WITH CHECK (public.is_main_admin(auth.uid()));

-- =========================================================
-- CHAT MESSAGES — drop unrestricted policy
-- =========================================================
DROP POLICY IF EXISTS "Users can view all chat messages" ON public.chat_messages;

-- =========================================================
-- USER PREFERENCES
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view preferences"   ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can update preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can insert preferences" ON public.user_preferences;

CREATE POLICY user_preferences_select_own
  ON public.user_preferences FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY user_preferences_insert_own
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY user_preferences_update_own
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- COOKIE CONSENT LOGS
-- =========================================================
DROP POLICY IF EXISTS "Admins can view consent logs" ON public.cookie_consent_logs;
CREATE POLICY cookie_consent_select_admin
  ON public.cookie_consent_logs FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- =========================================================
-- GALLERY VIEWS / DOWNLOADS
-- =========================================================
DROP POLICY IF EXISTS gallery_views_select_all     ON public.gallery_views;
DROP POLICY IF EXISTS gallery_views_update_anyone  ON public.gallery_views;
DROP POLICY IF EXISTS gallery_downloads_select_all ON public.gallery_downloads;

CREATE POLICY gallery_views_select_admin
  ON public.gallery_views FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));
CREATE POLICY gallery_downloads_select_admin
  ON public.gallery_downloads FOR SELECT TO authenticated
  USING (public.is_main_admin(auth.uid()));

-- =========================================================
-- GALLERY EVENTS — require auth + admin for writes
-- =========================================================
DROP POLICY IF EXISTS gallery_events_insert_authenticated ON public.gallery_events;
DROP POLICY IF EXISTS gallery_events_update_authenticated ON public.gallery_events;

CREATE POLICY gallery_events_insert_admin
  ON public.gallery_events FOR INSERT TO authenticated
  WITH CHECK (public.is_main_admin(auth.uid()));
CREATE POLICY gallery_events_update_admin
  ON public.gallery_events FOR UPDATE TO authenticated
  USING (public.is_main_admin(auth.uid()))
  WITH CHECK (public.is_main_admin(auth.uid()));

-- =========================================================
-- CANDIDATE DOCUMENTS — fix tautology
-- =========================================================
DROP POLICY IF EXISTS candidate_documents_read ON public.candidate_documents;
CREATE POLICY candidate_documents_read
  ON public.candidate_documents FOR SELECT TO authenticated
  USING (
    verified
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_documents.candidate_id
        AND c.user_id = auth.uid()
    )
    OR public.is_main_admin(auth.uid())
  );

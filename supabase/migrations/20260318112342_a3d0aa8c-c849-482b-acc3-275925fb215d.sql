
-- Fix: activity_log INSERT - enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
CREATE POLICY "Users can insert own activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Fix: profiles UPDATE - prevent role self-escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK ((auth.uid() = id) AND (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())));

-- Fix: clients - restrict write to admin/moderator (already done but re-confirm)
-- The SELECT true is intentional for this team CRM - all team members need client visibility
-- UPDATE is already restricted to admin/moderator via has_role


-- Populate user_roles for all staff users
INSERT INTO public.user_roles (user_id, role) VALUES
  ('71be075f-de86-411e-870a-0b6c8885ba61', 'admin'),       -- boss@test.pl
  ('7e1f8b44-876d-46ef-9748-438b428f548a', 'moderator'),   -- koordynator@test.pl
  ('49d629da-720c-43cd-9c68-9eb313752553', 'moderator'),   -- specjalista@test.pl
  ('40b4cf35-2845-4b7e-9984-bc11ef0a73c2', 'user'),        -- praktykant@test.pl
  ('6976e15a-d510-48c2-9b03-e99f7dfbbf4b', 'admin'),       -- bartosz.targosz
  ('3e4e98eb-ce9a-455e-890b-7bbc6c13d1f4', 'admin')        -- targosz15709
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow any authenticated user to create DM channels (direct messages)
-- Currently only staff can insert channels, but DMs should be available to all
DROP POLICY IF EXISTS "Staff can insert channels" ON public.channels;
CREATE POLICY "Authenticated can insert channels"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (
    is_staff(auth.uid()) OR is_direct = true
  );

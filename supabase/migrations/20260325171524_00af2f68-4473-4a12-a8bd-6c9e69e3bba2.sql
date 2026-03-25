-- Fix 1: Allow staff to UPDATE comments (koordynator fix)
CREATE POLICY "Staff can update comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

-- Update is_staff to also check profiles.role for koordynator
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator', 'superadmin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND role IN ('superadmin', 'boss', 'koordynator', 'admin')
  )
$$;
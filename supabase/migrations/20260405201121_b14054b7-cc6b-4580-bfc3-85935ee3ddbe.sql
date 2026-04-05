-- 1. Helper function to get current role without recursion
CREATE OR REPLACE FUNCTION public.get_own_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id;
$$;

-- 2. Fix profiles UPDATE: block self-escalation of role field
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (role IS NOT DISTINCT FROM get_own_role(auth.uid()))
  );

-- 3. Fix clients UPDATE: restrict to staff + own company
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON clients;
CREATE POLICY "Staff can update clients" ON clients
  FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Client can update own company" ON clients
  FOR UPDATE TO authenticated
  USING (id = get_client_id_for_user(auth.uid()))
  WITH CHECK (id = get_client_id_for_user(auth.uid()));

-- 4. Fix tasks SELECT: change public -> authenticated
DROP POLICY IF EXISTS "Kontakty widzą zadania swojej firmy" ON tasks;
CREATE POLICY "Kontakty widzą zadania swojej firmy" ON tasks
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (
      SELECT cc.user_id FROM customer_contacts cc WHERE cc.customer_id = tasks.client_id
    )
  );

-- 5. Fix role_permissions: allow staff (is_staff) to manage, not just app_role admin
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON role_permissions;
CREATE POLICY "Staff can manage role_permissions" ON role_permissions
  FOR ALL TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));
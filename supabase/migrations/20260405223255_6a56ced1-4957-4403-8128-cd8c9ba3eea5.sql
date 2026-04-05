
-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can view customer_contacts" ON public.customer_contacts;

-- Staff can view all customer contacts
CREATE POLICY "Staff can view customer_contacts"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Users can view their own contact record
CREATE POLICY "Users can view own customer_contact"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Client contacts can view other contacts in the same company
CREATE POLICY "Contacts can view same company contacts"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (customer_id = public.get_client_id_for_user(auth.uid()));

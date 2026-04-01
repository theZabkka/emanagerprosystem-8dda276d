
-- Allow contacts to update their own row (only safe fields)
CREATE POLICY "Contacts can update own record"
ON public.customer_contacts
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow contacts to read their own record
CREATE POLICY "Contacts can read own record"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Staff can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()));
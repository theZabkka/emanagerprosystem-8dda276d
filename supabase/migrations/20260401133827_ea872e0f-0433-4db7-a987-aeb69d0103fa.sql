
-- Allow client users to read tasks belonging to their company
CREATE POLICY "Clients can view own company tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND client_id = (SELECT p.client_id FROM public.profiles p WHERE p.id = auth.uid())
);

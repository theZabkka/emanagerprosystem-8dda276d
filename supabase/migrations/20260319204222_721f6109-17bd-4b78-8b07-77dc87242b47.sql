CREATE POLICY "Staff can update task_materials"
ON public.task_materials FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()) OR (uploaded_by = auth.uid()))
WITH CHECK (is_staff(auth.uid()) OR (uploaded_by = auth.uid()));
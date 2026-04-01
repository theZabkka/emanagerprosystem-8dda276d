-- Allow users to update their own comments
CREATE POLICY "Users can update own crm_deal_comments"
ON public.crm_deal_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_staff(auth.uid()));

-- Allow users to delete their own comments  
CREATE POLICY "Users can delete own crm_deal_comments"
ON public.crm_deal_comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR is_staff(auth.uid()));
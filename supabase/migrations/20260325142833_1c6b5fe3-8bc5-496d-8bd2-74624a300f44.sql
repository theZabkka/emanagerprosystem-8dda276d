
-- Bug 1: Fix channel_members INSERT policy to allow DM creation (adding the other user)
-- Current policy only allows user_id = auth.uid(), but DM creation needs to add the other person too
DROP POLICY IF EXISTS "Users can join channels" ON public.channel_members;
CREATE POLICY "Users can join or add DM members"
  ON public.channel_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id
        AND c.is_direct = true
        AND EXISTS (
          SELECT 1 FROM channel_members cm
          WHERE cm.channel_id = c.id AND cm.user_id = auth.uid()
        )
    )
    OR is_staff(auth.uid())
  );

-- Bug 2: Make chat_attachments bucket public so getPublicUrl() works
UPDATE storage.buckets SET public = true WHERE id = 'chat_attachments';

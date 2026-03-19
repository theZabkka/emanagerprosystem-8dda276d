
-- Add is_video_task to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_video_task boolean DEFAULT false;

-- Add accepted_responsibility_by (uuid of user who accepted responsibility)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accepted_responsibility_by uuid;

-- Add requires_client_reply to comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS requires_client_reply boolean DEFAULT false;

-- Add client_reply to comments (for when client responds)
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_reply text;

-- Allow clients to update comments (for adding replies)
CREATE POLICY "Clients can update comments with replies"
ON public.comments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.profiles p ON p.client_id = t.client_id
    WHERE t.id = comments.task_id AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.profiles p ON p.client_id = t.client_id
    WHERE t.id = comments.task_id AND p.id = auth.uid()
  )
);

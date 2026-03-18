
-- 1. Add is_direct column to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_direct BOOLEAN NOT NULL DEFAULT false;

-- 2. Add attachment columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 3. Create chat_attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for chat_attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat_attachments');

-- 5. Update channels RLS - allow update for channel members
CREATE POLICY "Authenticated can update own channels"
ON public.channels FOR UPDATE TO authenticated
USING (true);

-- 6. Allow delete channels for admins
CREATE POLICY "Authenticated can delete channels"
ON public.channels FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

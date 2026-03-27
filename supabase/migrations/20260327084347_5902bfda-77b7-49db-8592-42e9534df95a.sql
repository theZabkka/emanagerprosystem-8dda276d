
-- 1. Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'admin',
  sender_id UUID,
  body_html TEXT,
  body_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add message_id to ticket_attachments
ALTER TABLE public.ticket_attachments
  ADD COLUMN message_id UUID REFERENCES public.ticket_messages(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for ticket_messages
CREATE POLICY "Authenticated can view ticket_messages"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can insert ticket_messages"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Clients can insert own ticket_messages"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'client' AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t
      JOIN profiles p ON p.client_id = t.client_id
      WHERE t.id = ticket_messages.ticket_id AND p.id = auth.uid()
    )
  );

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

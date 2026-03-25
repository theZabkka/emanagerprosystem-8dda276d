-- Ticket comments table for threaded conversations
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ticket_comments"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own ticket_comments"
  ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id, created_at);

-- FAZA 1: Add retainer flag to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS has_retainer BOOLEAN NOT NULL DEFAULT false;

-- FAZA 2: Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Zgłoszenia problemów',
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Nowe',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.client_id = tickets.client_id
  ));

CREATE POLICY "Staff or client can insert tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.client_id = tickets.client_id
    )
  );

CREATE POLICY "Staff can update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()));

-- FAZA 2: Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket viewers can see attachments" ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_attachments.ticket_id
      AND (is_staff(auth.uid()) OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.client_id = t.client_id
      ))
  ));

CREATE POLICY "Authenticated can insert ticket attachments" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_attachments.ticket_id
      AND (is_staff(auth.uid()) OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.client_id = t.client_id
      ))
  ));

-- FAZA 5: Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket_attachments', 'ticket_attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload ticket files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket_attachments');

CREATE POLICY "Anyone can view ticket files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket_attachments');

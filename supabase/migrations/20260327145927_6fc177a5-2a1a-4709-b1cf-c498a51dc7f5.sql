CREATE TABLE public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_notes"
  ON public.client_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own client_notes"
  ON public.client_notes FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Author or admin can update client_notes"
  ON public.client_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR is_staff(auth.uid()));

CREATE POLICY "Author or admin can delete client_notes"
  ON public.client_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR is_staff(auth.uid()));
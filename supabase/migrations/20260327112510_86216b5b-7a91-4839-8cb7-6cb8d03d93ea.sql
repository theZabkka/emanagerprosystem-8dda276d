
CREATE TABLE public.response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select response_templates"
  ON public.response_templates FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert response_templates"
  ON public.response_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update response_templates"
  ON public.response_templates FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete response_templates"
  ON public.response_templates FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));

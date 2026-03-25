
-- Bug reports table
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  steps_to_reproduce TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_bug_report_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid bug report status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bug_report_status
  BEFORE INSERT OR UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_bug_report_status();

-- Bug attachments table
CREATE TABLE public.bug_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bug_reports_reporter ON public.bug_reports(reporter_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created ON public.bug_reports(created_at DESC);
CREATE INDEX idx_bug_attachments_bug ON public.bug_attachments(bug_id);

-- RLS for bug_reports
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR is_staff(auth.uid()));

CREATE POLICY "Staff can update bug reports"
  ON public.bug_reports FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()));

-- RLS for bug_attachments
ALTER TABLE public.bug_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug attachments"
  ON public.bug_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bug_reports br WHERE br.id = bug_id AND br.reporter_id = auth.uid()
  ) OR is_staff(auth.uid()));

CREATE POLICY "Users can view bug attachments"
  ON public.bug_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bug_reports br WHERE br.id = bug_id AND (br.reporter_id = auth.uid() OR is_staff(auth.uid()))
  ));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug_attachments', 'bug_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload bug attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bug_attachments');

CREATE POLICY "Anyone can read bug attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bug_attachments');

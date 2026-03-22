CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  caller_number text,
  callee_number text,
  direction text NOT NULL DEFAULT 'inbound',
  duration integer DEFAULT 0,
  recording_url text,
  transcription text,
  ai_summary text,
  zadarma_call_id text,
  status text NOT NULL DEFAULT 'completed',
  error_note text,
  called_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view calls" ON public.calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert calls" ON public.calls FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update calls" ON public.calls FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

CREATE INDEX idx_calls_client_id ON public.calls(client_id);
CREATE INDEX idx_calls_task_id ON public.calls(task_id);
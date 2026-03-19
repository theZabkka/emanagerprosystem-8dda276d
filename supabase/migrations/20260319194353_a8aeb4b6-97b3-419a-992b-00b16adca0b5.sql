
-- Create task_corrections table for correction requests from clients
CREATE TABLE public.task_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'critical')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Enable RLS
ALTER TABLE public.task_corrections ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view corrections
CREATE POLICY "Authenticated can view task_corrections"
ON public.task_corrections FOR SELECT TO authenticated
USING (true);

-- Staff or clients linked to the task can insert corrections
CREATE POLICY "Staff or task client can insert corrections"
ON public.task_corrections FOR INSERT TO authenticated
WITH CHECK (
  is_staff(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.profiles p ON p.client_id = t.client_id
    WHERE t.id = task_corrections.task_id AND p.id = auth.uid()
  )
);

-- Staff can update corrections (e.g. mark resolved)
CREATE POLICY "Staff can update corrections"
ON public.task_corrections FOR UPDATE TO authenticated
USING (is_staff(auth.uid()));

-- Allow clients to update task status (for accept/reject flow)
CREATE POLICY "Clients can update task status for their tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'klient' AND p.client_id = tasks.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'klient' AND p.client_id = tasks.client_id
  )
);


-- Internal tasks table for office/operational board
CREATE TABLE public.internal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'Inne',
  status text NOT NULL DEFAULT 'Do zrobienia',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.internal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view internal_tasks" ON public.internal_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert internal_tasks" ON public.internal_tasks
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Staff can update internal_tasks" ON public.internal_tasks
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Staff can delete internal_tasks" ON public.internal_tasks
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Internal task ratings table
CREATE TABLE public.internal_task_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.internal_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.internal_task_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view internal_task_ratings" ON public.internal_task_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upsert own ratings" ON public.internal_task_ratings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings" ON public.internal_task_ratings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

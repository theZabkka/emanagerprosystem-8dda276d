
CREATE TABLE public.user_task_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  position REAL NOT NULL DEFAULT 0,
  UNIQUE(user_id, task_id)
);

ALTER TABLE public.user_task_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON public.user_task_positions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own positions"
  ON public.user_task_positions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own positions"
  ON public.user_task_positions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own positions"
  ON public.user_task_positions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_user_task_positions_user ON public.user_task_positions(user_id);
CREATE INDEX idx_user_task_positions_lookup ON public.user_task_positions(user_id, task_id);

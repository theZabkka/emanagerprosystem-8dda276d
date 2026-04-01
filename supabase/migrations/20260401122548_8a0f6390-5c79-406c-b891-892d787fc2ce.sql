CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks (client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON public.tasks (is_archived);
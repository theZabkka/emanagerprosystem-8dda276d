
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view subtasks" ON public.subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert subtasks" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update subtasks" ON public.subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete subtasks" ON public.subtasks FOR DELETE TO authenticated USING (true);

CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklists" ON public.checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklists" ON public.checklists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update checklists" ON public.checklists FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  evidence_url TEXT,
  is_na BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklist_items" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklist_items" ON public.checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update checklist_items" ON public.checklist_items FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.task_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'file',
  name TEXT NOT NULL,
  url TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  is_visible_to_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view materials" ON public.task_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert materials" ON public.task_materials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete materials" ON public.task_materials FOR DELETE TO authenticated USING (true);

CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view time_logs" ON public.time_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own time_logs" ON public.time_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own time_logs" ON public.time_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'internal',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view status history" ON public.task_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert status history" ON public.task_status_history FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_goal TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_deliverable TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_format TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_input_materials TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_dont_do TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS brief_inspiration TEXT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_status_history;

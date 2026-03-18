ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brief_data jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary text;
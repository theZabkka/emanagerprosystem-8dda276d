ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS bug_severity text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS bug_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS bug_description text;
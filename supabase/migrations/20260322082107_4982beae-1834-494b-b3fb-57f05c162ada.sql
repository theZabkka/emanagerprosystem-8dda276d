
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_misunderstood boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS misunderstood_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS misunderstood_reason text;

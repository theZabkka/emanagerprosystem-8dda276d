ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS public_status_token text UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb DEFAULT '[]'::jsonb;
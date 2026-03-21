
ALTER TABLE public.pipeline_deals
  ADD COLUMN IF NOT EXISTS probability integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS expected_close_date date,
  ADD COLUMN IF NOT EXISTS last_contact_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone DEFAULT now();

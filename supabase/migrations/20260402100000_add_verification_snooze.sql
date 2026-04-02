-- Add snooze columns for verification deferral
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS verification_snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_snooze_count INTEGER DEFAULT 0 NOT NULL;

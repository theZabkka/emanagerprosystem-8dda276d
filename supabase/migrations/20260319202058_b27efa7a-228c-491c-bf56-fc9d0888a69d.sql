
-- Add new columns to profiles for client registration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS position text;

-- Add new columns to clients for company info
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS nip text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Poland',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS voivodeship text;

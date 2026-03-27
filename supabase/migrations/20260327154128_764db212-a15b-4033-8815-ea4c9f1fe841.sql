
-- Convert client_status enum column to TEXT for flexibility
ALTER TABLE public.clients 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.clients 
  ALTER COLUMN status TYPE TEXT USING status::TEXT;

ALTER TABLE public.clients 
  ALTER COLUMN status SET DEFAULT 'Nowy kontakt';

-- Migrate existing values to new lifecycle statuses
UPDATE public.clients SET status = 'Aktywny klient' WHERE status = 'active';
UPDATE public.clients SET status = 'Nowy kontakt' WHERE status = 'potential';
UPDATE public.clients SET status = 'W negocjacjach' WHERE status = 'negotiations';
UPDATE public.clients SET status = 'Aktywny klient' WHERE status = 'project';
UPDATE public.clients SET status = 'Nieaktywny' WHERE status = 'inactive';

-- Drop the old enum type if no longer used
DROP TYPE IF EXISTS public.client_status;

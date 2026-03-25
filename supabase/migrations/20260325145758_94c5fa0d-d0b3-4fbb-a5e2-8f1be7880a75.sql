
-- Add priority and assigned_to columns to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Średni';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);


ALTER TABLE public.tickets ADD COLUMN contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL;

-- Backfill existing tickets: set contact_id = created_by where created_by matches a customer_contacts record
UPDATE public.tickets t
SET contact_id = t.created_by
WHERE t.created_by IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.customer_contacts cc WHERE cc.id = t.created_by);

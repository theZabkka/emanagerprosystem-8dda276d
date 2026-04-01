
ALTER TABLE public.customer_contacts
ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{"invoices": true, "estimates": true, "contracts": true, "support": true, "projects": true}'::jsonb;

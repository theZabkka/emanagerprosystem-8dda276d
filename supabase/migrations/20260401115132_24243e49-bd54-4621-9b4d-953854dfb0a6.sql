
CREATE TABLE public.customer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  position TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view customer_contacts"
  ON public.customer_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can insert customer_contacts"
  ON public.customer_contacts FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update customer_contacts"
  ON public.customer_contacts FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete customer_contacts"
  ON public.customer_contacts FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));

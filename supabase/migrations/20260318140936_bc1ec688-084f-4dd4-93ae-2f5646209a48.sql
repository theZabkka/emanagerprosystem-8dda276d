
-- Client contracts table
CREATE TABLE public.client_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_contracts" ON public.client_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_contracts" ON public.client_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_contracts" ON public.client_contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_contracts" ON public.client_contracts FOR DELETE TO authenticated USING (true);

-- Client orders table
CREATE TABLE public.client_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_orders" ON public.client_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_orders" ON public.client_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_orders" ON public.client_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_orders" ON public.client_orders FOR DELETE TO authenticated USING (true);

-- Client social media accounts table
CREATE TABLE public.client_social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  url TEXT,
  followers INTEGER DEFAULT 0,
  last_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_social_accounts" ON public.client_social_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_social_accounts" ON public.client_social_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_social_accounts" ON public.client_social_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_social_accounts" ON public.client_social_accounts FOR DELETE TO authenticated USING (true);

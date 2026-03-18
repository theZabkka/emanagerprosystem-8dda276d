
-- Client offers table
CREATE TABLE public.client_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.client_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_offers" ON public.client_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_offers" ON public.client_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_offers" ON public.client_offers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_offers" ON public.client_offers FOR DELETE TO authenticated USING (true);

-- Client ideas table
CREATE TABLE public.client_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.client_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_ideas" ON public.client_ideas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_ideas" ON public.client_ideas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_ideas" ON public.client_ideas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_ideas" ON public.client_ideas FOR DELETE TO authenticated USING (true);

-- Client conversations table
CREATE TABLE public.client_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'phone',
  summary TEXT,
  participant_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_conversations" ON public.client_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_conversations" ON public.client_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_conversations" ON public.client_conversations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete client_conversations" ON public.client_conversations FOR DELETE TO authenticated USING (true);

-- Client files table
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  url TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_files" ON public.client_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_files" ON public.client_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete client_files" ON public.client_files FOR DELETE TO authenticated USING (true);

-- Client invoice data table
CREATE TABLE public.client_invoice_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT,
  nip TEXT,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_invoice_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view client_invoice_data" ON public.client_invoice_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert client_invoice_data" ON public.client_invoice_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update client_invoice_data" ON public.client_invoice_data FOR UPDATE TO authenticated USING (true);

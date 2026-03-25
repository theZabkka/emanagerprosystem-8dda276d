
-- CRM Columns table
CREATE TABLE public.crm_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lexo_rank text NOT NULL DEFAULT 'U',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_columns" ON public.crm_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert crm_columns" ON public.crm_columns FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update crm_columns" ON public.crm_columns FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete crm_columns" ON public.crm_columns FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- CRM Labels table
CREATE TABLE public.crm_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_labels" ON public.crm_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage crm_labels" ON public.crm_labels FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- CRM Deals table
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  column_id uuid NOT NULL REFERENCES public.crm_columns(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id),
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  is_archived boolean NOT NULL DEFAULT false,
  reminder_active boolean NOT NULL DEFAULT false,
  reminder_trigger_date timestamptz,
  lexo_rank text NOT NULL DEFAULT 'U',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_deals" ON public.crm_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert crm_deals" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update crm_deals" ON public.crm_deals FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete crm_deals" ON public.crm_deals FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- CRM Deal Labels junction table
CREATE TABLE public.crm_deal_labels (
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.crm_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, label_id)
);

ALTER TABLE public.crm_deal_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_deal_labels" ON public.crm_deal_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage crm_deal_labels" ON public.crm_deal_labels FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- CRM Deal Comments table
CREATE TABLE public.crm_deal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_deal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view crm_deal_comments" ON public.crm_deal_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.crm_deal_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Seed default columns
INSERT INTO public.crm_columns (name, lexo_rank) VALUES
  ('Do zrobienia', 'D'),
  ('W realizacji', 'H'),
  ('Oczekiwanie na klienta', 'L'),
  ('Weryfikacja', 'P'),
  ('Poprawki', 'T');

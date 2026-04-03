
-- KROK 1a: Add user_id column to customer_contacts
ALTER TABLE public.customer_contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique index on user_id (one auth user = one contact)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_contacts_user_id
  ON public.customer_contacts(user_id) WHERE user_id IS NOT NULL;

-- KROK 1b: Backfill user_id from profiles by matching email
UPDATE public.customer_contacts cc
SET user_id = p.id
FROM public.profiles p
WHERE LOWER(TRIM(cc.email)) = LOWER(TRIM(p.email))
  AND p.role = 'klient'
  AND cc.user_id IS NULL;

-- KROK 1c: Create helper function get_client_id_for_user
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.customer_contacts
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- KROK 1d: Fix RLS on customer_contacts — replace id=auth.uid() with user_id=auth.uid()
DROP POLICY IF EXISTS "Contacts can read own record" ON public.customer_contacts;
CREATE POLICY "Contacts can read own record"
  ON public.customer_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Contacts can update own record" ON public.customer_contacts;
CREATE POLICY "Contacts can update own record"
  ON public.customer_contacts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- KROK 1e: Add RLS policies for clients reading tasks by their company
-- Tasks: clients can read tasks belonging to their company
CREATE POLICY "Client contacts can read company tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    AND client_id IS NOT NULL
  );

-- Projects: clients can read projects belonging to their company
CREATE POLICY "Client contacts can read company projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    AND client_id IS NOT NULL
  );

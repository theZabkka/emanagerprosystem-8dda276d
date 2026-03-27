DO $$
BEGIN
  -- Ensure RLS is enabled on clients
  EXECUTE 'ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY';

  -- Replace restrictive update policy with authenticated update policy
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Admins can update clients'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update clients" ON public.clients';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Allow authenticated users to update clients'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated users to update clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  ELSE
    EXECUTE 'ALTER POLICY "Allow authenticated users to update clients" ON public.clients TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
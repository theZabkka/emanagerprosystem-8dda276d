
-- Vault credentials table
CREATE TABLE public.vault_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select vault_credentials" ON public.vault_credentials
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert vault_credentials" ON public.vault_credentials
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update vault_credentials" ON public.vault_credentials
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete vault_credentials" ON public.vault_credentials
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- Vault audit logs table
CREATE TABLE public.vault_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES public.vault_credentials(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select vault_audit_logs" ON public.vault_audit_logs
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert vault_audit_logs" ON public.vault_audit_logs
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

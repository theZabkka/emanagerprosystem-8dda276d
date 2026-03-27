-- Table: vault_access_grants (PAM: who has access to which credential, with optional TTL)
CREATE TABLE IF NOT EXISTS public.vault_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.vault_credentials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(credential_id, user_id)
);

ALTER TABLE public.vault_access_grants ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Staff can manage vault_access_grants"
  ON public.vault_access_grants FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Users can see their own grants (active ones)
CREATE POLICY "Users can view own grants"
  ON public.vault_access_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update vault_credentials RLS: staff sees all, others see only granted
DROP POLICY IF EXISTS "Staff can select vault_credentials" ON public.vault_credentials;
DROP POLICY IF EXISTS "Authenticated can view vault_credentials" ON public.vault_credentials;

CREATE POLICY "Vault credentials access"
  ON public.vault_credentials FOR SELECT
  TO authenticated
  USING (
    is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vault_access_grants
      WHERE vault_access_grants.credential_id = vault_credentials.id
        AND vault_access_grants.user_id = auth.uid()
        AND (vault_access_grants.expires_at IS NULL OR vault_access_grants.expires_at > now())
    )
  );
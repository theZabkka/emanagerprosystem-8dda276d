ALTER TABLE vault_credentials ADD COLUMN secret_type text NOT NULL DEFAULT 'password';
COMMENT ON COLUMN vault_credentials.secret_type IS 'Type of secret: password or api_key';
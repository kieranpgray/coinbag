-- Migration: Add pgcrypto helper functions for SnapTrade userSecret encryption/decryption
-- These are SECURITY DEFINER functions callable by service role only.
-- They wrap pgp_sym_encrypt / pgp_sym_decrypt so the edge function never
-- receives the raw encryption key — it's passed as a parameter from Deno.env.

CREATE OR REPLACE FUNCTION encrypt_snaptrade_secret(raw_secret text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgp_sym_encrypt(raw_secret, encryption_key);
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_snaptrade_secret(encrypted_secret text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_secret::bytea, encryption_key);
END;
$$;

-- Revoke public access; only service role (used by edge functions) can call these
REVOKE EXECUTE ON FUNCTION encrypt_snaptrade_secret(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION decrypt_snaptrade_secret(text, text) FROM PUBLIC;

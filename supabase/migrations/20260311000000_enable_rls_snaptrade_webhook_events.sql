-- Remediation: Security advisor 0013 (rls_disabled_in_public)
-- Enable RLS on webhook audit log table to prevent client access via PostgREST.
-- Service role used by edge functions bypasses RLS and remains unaffected.
ALTER TABLE public.snaptrade_webhook_events ENABLE ROW LEVEL SECURITY;

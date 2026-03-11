-- Remediation: Security advisor 0010 (security_definer_view)
-- Legacy backward-compatibility view is no longer required by application code.
DROP VIEW IF EXISTS public.subscriptions;

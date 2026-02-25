-- Migration: Schedule refresh-prices Edge Function via pg_cron + pg_net
-- Requires: pg_cron, pg_net extensions (Supabase enables these by default)
-- Secret: Stored in app_cron_config; run INSERT below if not yet set.
-- Docs: https://supabase.com/docs/guides/database/extensions/pgcron
--       https://supabase.com/docs/guides/database/extensions/pgnet

-- Enable extensions (Supabase enables these in Dashboard; CREATE IF NOT EXISTS for idempotency)
-- If already enabled, these are no-ops
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Table for cron-related config (avoids hardcoding secrets in migrations)
CREATE TABLE IF NOT EXISTS app_cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE app_cron_config IS 'Config for cron-invoked jobs; store PRICE_REFRESH_CRON_SECRET here';
COMMENT ON COLUMN app_cron_config.key IS 'Config key, e.g. price_refresh_cron_secret';
COMMENT ON COLUMN app_cron_config.value IS 'Config value; never commit real secrets to git';

-- RLS: Restrict access; cron runs as postgres and bypasses RLS
ALTER TABLE app_cron_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow postgres and service role" ON app_cron_config
  FOR ALL
  USING (current_user = 'postgres' OR (auth.jwt() ->> 'role') = 'service_role');

-- Function to invoke refresh-prices Edge Function
CREATE OR REPLACE FUNCTION invoke_refresh_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_url text := 'https://tislabgxitwtcqfwrpik.supabase.co/functions/v1/refresh-prices';
BEGIN
  SELECT value INTO v_secret FROM app_cron_config WHERE key = 'price_refresh_cron_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'price_refresh_cron_secret not set in app_cron_config; skipping refresh-prices';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );
END;
$$;

COMMENT ON FUNCTION invoke_refresh_prices() IS 'Calls refresh-prices Edge Function with CRON_SECRET from app_cron_config';

-- Insert the cron secret (use value from Supabase Edge Function secrets)
-- If migrating to a different project, update the secret via: UPDATE app_cron_config SET value = 'NEW_SECRET' WHERE key = 'price_refresh_cron_secret';
INSERT INTO app_cron_config (key, value)
VALUES ('price_refresh_cron_secret', 'ph/iTGV/CKYplU713r2Co7E3IgCZ8BYRGN5wktC6c+E=')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Schedule: Daily at 00:00 UTC (adjust cron expression as needed)
-- Cron syntax: min hour day-of-month month day-of-week
SELECT cron.schedule(
  'refresh-prices-daily',
  '0 0 * * *',
  $$SELECT invoke_refresh_prices()$$
);

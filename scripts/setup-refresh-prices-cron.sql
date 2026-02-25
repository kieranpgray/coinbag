-- Run this in Supabase Dashboard -> SQL Editor
-- Project: tislabgxitwtcqfwrpik (supafolio-dev)
-- Enables pg_cron + pg_net, creates schedule for refresh-prices Edge Function

-- 1. Enable extensions (if not already enabled - skip if you get "already exists")
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Config table for cron secrets
CREATE TABLE IF NOT EXISTS app_cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE app_cron_config IS 'Config for cron-invoked jobs; store PRICE_REFRESH_CRON_SECRET here';

ALTER TABLE app_cron_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow postgres and service role" ON app_cron_config;
CREATE POLICY "Allow postgres and service role" ON app_cron_config
  FOR ALL
  USING (current_user = 'postgres' OR (auth.jwt() ->> 'role') = 'service_role');

-- 3. Function to invoke refresh-prices
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

-- 4. Insert cron secret (matches PRICE_REFRESH_CRON_SECRET in Edge Function secrets)
INSERT INTO app_cron_config (key, value)
VALUES ('price_refresh_cron_secret', 'ph/iTGV/CKYplU713r2Co7E3IgCZ8BYRGN5wktC6c+E=')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 5. Schedule: Daily at 00:00 UTC
SELECT cron.schedule(
  'refresh-prices-daily',
  '0 0 * * *',
  $$SELECT invoke_refresh_prices()$$
);

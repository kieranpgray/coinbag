-- Migration: Add price caching tables and assets columns
-- Description: Creates symbol_prices (global price cache), user_price_refreshes (rate-limit tracking),
--   and adds last_price_fetched_at, price_source to assets. Index on (ticker, type) for price lookups.
-- Auth: Clerk provides identity. user_id stores JWT sub claim; NO FK to auth.users.
-- RLS: All policies use (auth.jwt() ->> 'sub') = user_id.
-- Prerequisites: assets table exists with ticker, type columns.
-- Plan: specs/price-refresh/SPEC.md, .cursor/plans/price_refresh_spec_plan_update_17c337a4.plan.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- symbol_prices: global price cache (symbol + asset_class)
-- =============================================================================
CREATE TABLE IF NOT EXISTS symbol_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  asset_class text NOT NULL,
  price numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  source text,
  market text,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(symbol, asset_class)
);

COMMENT ON TABLE symbol_prices IS 'Global price cache for symbols by asset class';
COMMENT ON COLUMN symbol_prices.symbol IS 'Ticker/symbol (normalized, e.g. uppercase)';
COMMENT ON COLUMN symbol_prices.asset_class IS 'stock, crypto, etf, forex, super, 401k';
COMMENT ON COLUMN symbol_prices.fetched_at IS 'When price was fetched';

CREATE INDEX IF NOT EXISTS idx_symbol_prices_symbol ON symbol_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_symbol_prices_fetched_at ON symbol_prices(fetched_at);
CREATE INDEX IF NOT EXISTS idx_symbol_prices_asset_class ON symbol_prices(asset_class);

ALTER TABLE symbol_prices ENABLE ROW LEVEL SECURITY;

-- symbol_prices: authenticated users can read (no user_id on table; shared cache)
-- For shared cache, allow SELECT for any authenticated request (JWT present with sub)
CREATE POLICY "Authenticated can read symbol_prices" ON symbol_prices
  FOR SELECT
  USING (auth.jwt() IS NOT NULL AND (auth.jwt() ->> 'sub') IS NOT NULL);

-- Service role / cron will use service key; INSERT/UPDATE need bypass.
-- Only service role (used inside Edge Function) writes; no RLS policy for INSERT/UPDATE from client.
-- Supabase service role bypasses RLS by default.
-- For anon/authenticated: no INSERT/UPDATE policies = no writes from client (correct for cron-only writes).

-- =============================================================================
-- user_price_refreshes: rate-limit tracking (user_id = Clerk sub, NO FK to auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_price_refreshes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  refresh_type text NOT NULL CHECK (refresh_type IN ('manual', 'scheduled')),
  symbols_refreshed text[],
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE user_price_refreshes IS 'Tracks manual and scheduled price refreshes for rate limiting';
COMMENT ON COLUMN user_price_refreshes.user_id IS 'Clerk user id (JWT sub claim); not a FK to auth.users';
COMMENT ON COLUMN user_price_refreshes.refresh_type IS 'manual or scheduled';
COMMENT ON COLUMN user_price_refreshes.symbols_refreshed IS 'Array of symbols refreshed';

CREATE INDEX IF NOT EXISTS idx_user_price_refreshes_user_id ON user_price_refreshes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_price_refreshes_created_at ON user_price_refreshes(created_at);

ALTER TABLE user_price_refreshes ENABLE ROW LEVEL SECURITY;

-- RLS: Clerk JWT sub = user_id (same pattern as assets)
CREATE POLICY "Users can select own refreshes" ON user_price_refreshes
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can insert own refreshes" ON user_price_refreshes
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- =============================================================================
-- assets: add last_price_fetched_at, price_source; index on (ticker, type)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'last_price_fetched_at') THEN
    ALTER TABLE assets ADD COLUMN last_price_fetched_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'price_source') THEN
    ALTER TABLE assets ADD COLUMN price_source text;
  END IF;
END $$;

COMMENT ON COLUMN assets.last_price_fetched_at IS 'When price was last fetched from external API';
COMMENT ON COLUMN assets.price_source IS 'Source of last fetched price (e.g. yahoo, coingecko)';

-- Index for price lookups: (ticker, type) where ticker is set. Only if ticker column exists (Stock/RSU migration must run first).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'ticker') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_ticker_type ON assets(ticker, type) WHERE ticker IS NOT NULL;
  END IF;
END $$;

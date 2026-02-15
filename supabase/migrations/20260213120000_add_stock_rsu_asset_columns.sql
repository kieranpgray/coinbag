-- Migration: Add Stock and RSU asset types and type-specific columns
-- Description: Adds nullable columns for Stock/RSU (ticker, exchange, quantity,
--   purchase_price, purchase_date, todays_price, grant_date, vesting_date)
--   and extends assets_type_check to include 'Stock' and 'RSU'.
-- Prerequisites: Requires existing assets table (with Cash, Superannuation already in type check)
-- Rollback: Drop new columns; restore previous type CHECK.

-- Phase 1: Add new columns only if they do not exist (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'ticker') THEN
    ALTER TABLE assets ADD COLUMN ticker text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'exchange') THEN
    ALTER TABLE assets ADD COLUMN exchange text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'quantity') THEN
    ALTER TABLE assets ADD COLUMN quantity numeric(18,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'purchase_price') THEN
    ALTER TABLE assets ADD COLUMN purchase_price numeric(12,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'purchase_date') THEN
    ALTER TABLE assets ADD COLUMN purchase_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'todays_price') THEN
    ALTER TABLE assets ADD COLUMN todays_price numeric(12,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'grant_date') THEN
    ALTER TABLE assets ADD COLUMN grant_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'vesting_date') THEN
    ALTER TABLE assets ADD COLUMN vesting_date date;
  END IF;
END $$;

-- Phase 2: Extend type CHECK to include Stock and RSU (do not remove existing types)
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_type_check
  CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU', 'Other'));

COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Stock, RSU, Other';
COMMENT ON COLUMN assets.ticker IS 'Stock ticker or RSU symbol; required when type is Stock or RSU';
COMMENT ON COLUMN assets.exchange IS 'Exchange (e.g. NASDAQ, NYSE, ASX); optional for Stock/RSU';
COMMENT ON COLUMN assets.quantity IS 'Number of shares/units; used for Stock, RSU';
COMMENT ON COLUMN assets.purchase_price IS 'Price per share at purchase; used for Stock';
COMMENT ON COLUMN assets.purchase_date IS 'Date of purchase; optional for Stock';
COMMENT ON COLUMN assets.todays_price IS 'Current/entry price for RSU valuation';
COMMENT ON COLUMN assets.grant_date IS 'RSU grant date; optional';
COMMENT ON COLUMN assets.vesting_date IS 'RSU vesting date; required for RSU';

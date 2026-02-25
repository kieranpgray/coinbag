-- Migration: Rename Investments to Other Investments, remove Other
-- Description: Migrate type 'Other' and 'Investments' to 'Other Investments'; update type CHECK.
-- Prerequisites: assets table with assets_type_check.
-- Plan: specs/asset-fields-update

-- 1. Drop old constraint (allows 'Investments'/'Other' but not 'Other Investments'), then add new one NOT VALID
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_type_check
  CHECK (type IN ('Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU'))
  NOT VALID;

-- 2. Migrate legacy types to 'Other Investments' (now allowed by new constraint)
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

UPDATE assets SET type = 'Other Investments'
  WHERE type IS NOT NULL
  AND type IN ('Other', 'Investments');

UPDATE assets SET type = TRIM(type) WHERE type IS NOT NULL AND type <> TRIM(type);
UPDATE assets SET type = 'Other Investments'
  WHERE type IS NOT NULL
  AND type NOT IN ('Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU');

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 3. Validate all rows satisfy the new constraint
ALTER TABLE assets VALIDATE CONSTRAINT assets_type_check;

COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Other Investments, Vehicles, Crypto, Cash, Superannuation, Stock, RSU';

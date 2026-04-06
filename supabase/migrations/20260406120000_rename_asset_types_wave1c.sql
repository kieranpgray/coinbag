-- Migration: Rename asset type stored values (Wave 1c copy / data alignment)
-- Description: Updates human-readable type strings on assets.type; replaces CHECK constraint.
-- Replaces: Stock→Shares, Real Estate→Property, Superannuation→Super, Vehicles→Vehicle,
--           RSU→RSUs, Other Investments→Other asset. Unchanged: Crypto, Cash.

-- 1. Drop existing CHECK, add new one NOT VALID
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_type_check
  CHECK (type IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs'))
  NOT VALID;

-- 2. Migrate data (RLS can block updates; mirror prior asset-type migration)
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

UPDATE assets SET type = 'Shares' WHERE type = 'Stock';
UPDATE assets SET type = 'Property' WHERE type = 'Real Estate';
UPDATE assets SET type = 'Super' WHERE type = 'Superannuation';
UPDATE assets SET type = 'Vehicle' WHERE type = 'Vehicles';
UPDATE assets SET type = 'RSUs' WHERE type = 'RSU';
UPDATE assets SET type = 'Other asset' WHERE type = 'Other Investments';

UPDATE assets SET type = TRIM(type) WHERE type IS NOT NULL AND type <> TRIM(type);
UPDATE assets SET type = 'Other asset'
  WHERE type IS NOT NULL
  AND type NOT IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs');

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 3. Validate constraint
ALTER TABLE assets VALIDATE CONSTRAINT assets_type_check;

COMMENT ON COLUMN assets.type IS 'Asset type: Property, Other asset, Vehicle, Crypto, Cash, Super, Shares, RSUs';

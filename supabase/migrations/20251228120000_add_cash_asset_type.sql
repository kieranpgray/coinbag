-- Migration: Add 'Cash' asset type to assets table
-- Description: Adds 'Cash' as a valid asset type option
-- Prerequisites: Requires existing assets table
-- Rollback: Remove 'Cash' from CHECK constraint

-- Add 'Cash' to the CHECK constraint
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

ALTER TABLE assets
  ADD CONSTRAINT assets_type_check 
  CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Other'));

-- Update column comment to reflect new type
COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Cash, Other';


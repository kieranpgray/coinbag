-- Migration: Add 'Superannuation' asset type to assets table
-- Description: Adds 'Superannuation' as a valid asset type option
-- Prerequisites: Requires existing assets table
-- Rollback: Remove 'Superannuation' from CHECK constraint

-- Drop existing constraint
ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_type_check;

-- Add new constraint with Superannuation included
ALTER TABLE assets
  ADD CONSTRAINT assets_type_check 
  CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Other'));

-- Update column comment to reflect new type
COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Cash, Superannuation, Other';


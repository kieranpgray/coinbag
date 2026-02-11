-- Migration: Create asset_value_history table with RLS policies
-- Description: Creates the asset_value_history table to track value changes for assets
-- Prerequisites: Requires assets table and pgcrypto extension
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create asset_value_history table
CREATE TABLE IF NOT EXISTS asset_value_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  previous_value numeric(10,2), -- NULL for initial creation
  new_value numeric(10,2) NOT NULL,
  change_amount numeric(10,2) GENERATED ALWAYS AS (new_value - COALESCE(previous_value, 0)) STORED,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub')
);

-- Add table comment
COMMENT ON TABLE asset_value_history IS 'History of value changes for assets';

-- Add column comments
COMMENT ON COLUMN asset_value_history.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN asset_value_history.asset_id IS 'Foreign key to assets table';
COMMENT ON COLUMN asset_value_history.previous_value IS 'Previous asset value (NULL for initial creation)';
COMMENT ON COLUMN asset_value_history.new_value IS 'New asset value after change';
COMMENT ON COLUMN asset_value_history.change_amount IS 'Computed change amount (new_value - previous_value)';
COMMENT ON COLUMN asset_value_history.created_at IS 'Timestamp when change was recorded';
COMMENT ON COLUMN asset_value_history.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_value_history_asset_id ON asset_value_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_history_user_id ON asset_value_history(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_history_created_at ON asset_value_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE asset_value_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own asset value history
CREATE POLICY "Users can view their own asset value history" ON asset_value_history
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own asset value history
CREATE POLICY "Users can create their own asset value history" ON asset_value_history
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users cannot update asset value history (history is immutable)
-- No UPDATE policy - history should be append-only

-- Policy: Users cannot delete asset value history (history is immutable)
-- No DELETE policy - history should be append-only

-- Create rollback function for easy migration reversal
CREATE OR REPLACE FUNCTION rollback_asset_value_history_migration()
RETURNS void AS $$
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "Users can create their own asset value history" ON asset_value_history;
  DROP POLICY IF EXISTS "Users can view their own asset value history" ON asset_value_history;

  -- Disable RLS
  ALTER TABLE asset_value_history DISABLE ROW LEVEL SECURITY;

  -- Drop indexes
  DROP INDEX IF EXISTS idx_asset_value_history_created_at;
  DROP INDEX IF EXISTS idx_asset_value_history_user_id;
  DROP INDEX IF EXISTS idx_asset_value_history_asset_id;

  -- Drop table
  DROP TABLE IF EXISTS asset_value_history;

  RAISE NOTICE 'Successfully rolled back asset_value_history migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_asset_value_history_migration() IS 'Rollback function for asset_value_history migration - call with SELECT rollback_asset_value_history_migration();';

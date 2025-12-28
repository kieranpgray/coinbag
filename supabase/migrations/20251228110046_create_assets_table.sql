-- Migration: Create assets table with RLS policies
-- Description: Creates the assets table for the Moneybags application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Other')),
  value numeric(10,2) NOT NULL,
  change_1d numeric(10,2),
  change_1w numeric(10,2),
  date_added date NOT NULL,
  institution text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE assets IS 'Financial assets for users';

-- Add column comments
COMMENT ON COLUMN assets.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN assets.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN assets.name IS 'Display name of the asset';
COMMENT ON COLUMN assets.type IS 'Asset type: Real Estate, Investments, Vehicles, Crypto, Other';
COMMENT ON COLUMN assets.value IS 'Asset value in dollars';
COMMENT ON COLUMN assets.change_1d IS 'One-day change percentage';
COMMENT ON COLUMN assets.change_1w IS 'One-week change percentage';
COMMENT ON COLUMN assets.date_added IS 'Date when asset was added';
COMMENT ON COLUMN assets.institution IS 'Optional institution name';
COMMENT ON COLUMN assets.notes IS 'Optional notes about the asset';
COMMENT ON COLUMN assets.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN assets.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_date_added ON assets(date_added);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own assets
CREATE POLICY "Users can view their own assets" ON assets
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own assets
CREATE POLICY "Users can create their own assets" ON assets
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own assets
CREATE POLICY "Users can update their own assets" ON assets
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own assets
CREATE POLICY "Users can delete their own assets" ON assets
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Create function for updating updated_at timestamp
-- Note: CREATE OR REPLACE is safe - if function exists from subscriptions migration, it will be replaced with identical code
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create rollback function for easy migration reversal
CREATE OR REPLACE FUNCTION rollback_assets_migration()
RETURNS void AS $$
BEGIN
  -- Drop trigger first
  DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;

  -- Drop policies
  DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
  DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
  DROP POLICY IF EXISTS "Users can create their own assets" ON assets;
  DROP POLICY IF EXISTS "Users can view their own assets" ON assets;

  -- Disable RLS
  ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

  -- Drop indexes
  DROP INDEX IF EXISTS idx_assets_date_added;
  DROP INDEX IF EXISTS idx_assets_type;
  DROP INDEX IF EXISTS idx_assets_user_id;

  -- Drop table
  DROP TABLE IF EXISTS assets;

  RAISE NOTICE 'Successfully rolled back assets migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_assets_migration() IS 'Rollback function for assets migration - call with SELECT rollback_assets_migration();';


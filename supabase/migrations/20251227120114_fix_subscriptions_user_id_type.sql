-- Migration: Fix subscriptions user_id to use text (Clerk JWT sub) instead of UUID
-- Description: Aligns subscriptions table with categories table for consistent Clerk integration
-- Prerequisites: Requires categories table from previous migration
-- Rollback: Revert back to uuid type (may cause data loss if Clerk subs are non-UUID)

-- Step 1: Drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

-- Step 2: Drop index on user_id
DROP INDEX IF EXISTS idx_subscriptions_user_id;

-- Step 3: Change user_id column from uuid to text with default from JWT
ALTER TABLE subscriptions 
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Set default to match categories table pattern
ALTER TABLE subscriptions 
  ALTER COLUMN user_id SET DEFAULT (auth.jwt() ->> 'sub');

-- Step 4: Recreate index on user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Step 5: Recreate RLS policies using auth.jwt()->>'sub' like categories table
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can create their own subscriptions" ON subscriptions
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON subscriptions
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Update comments to reflect new type
COMMENT ON COLUMN subscriptions.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';

-- Create rollback function
CREATE OR REPLACE FUNCTION rollback_subscriptions_user_id_type_migration()
RETURNS void AS $$
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can create their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
  
  -- Drop index
  DROP INDEX IF EXISTS idx_subscriptions_user_id;
  
  -- Revert column type (WARNING: may fail if user_id contains non-UUID values)
  ALTER TABLE subscriptions 
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  
  ALTER TABLE subscriptions 
    ALTER COLUMN user_id DROP DEFAULT;
  
  -- Recreate index
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  
  -- Recreate original policies
  CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create their own subscriptions" ON subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own subscriptions" ON subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);
  
  COMMENT ON COLUMN subscriptions.user_id IS 'Clerk user ID for RLS policies';
  
  RAISE NOTICE 'Successfully rolled back subscriptions user_id type migration';
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION rollback_subscriptions_user_id_type_migration() IS 'Rollback function for subscriptions user_id type fix - call with SELECT rollback_subscriptions_user_id_type_migration();';


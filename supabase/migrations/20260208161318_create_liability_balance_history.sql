-- Migration: Create liability_balance_history table with RLS policies
-- Description: Creates the liability_balance_history table to track balance changes for liabilities
-- Prerequisites: Requires liabilities table and pgcrypto extension
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create liability_balance_history table
CREATE TABLE IF NOT EXISTS liability_balance_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  liability_id uuid NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
  previous_balance numeric(10,2), -- NULL for initial creation
  new_balance numeric(10,2) NOT NULL,
  change_amount numeric(10,2) GENERATED ALWAYS AS (new_balance - COALESCE(previous_balance, 0)) STORED,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub')
);

-- Add table comment
COMMENT ON TABLE liability_balance_history IS 'History of balance changes for liabilities';

-- Add column comments
COMMENT ON COLUMN liability_balance_history.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN liability_balance_history.liability_id IS 'Foreign key to liabilities table';
COMMENT ON COLUMN liability_balance_history.previous_balance IS 'Previous liability balance (NULL for initial creation)';
COMMENT ON COLUMN liability_balance_history.new_balance IS 'New liability balance after change';
COMMENT ON COLUMN liability_balance_history.change_amount IS 'Computed change amount (new_balance - previous_balance)';
COMMENT ON COLUMN liability_balance_history.created_at IS 'Timestamp when change was recorded';
COMMENT ON COLUMN liability_balance_history.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_liability_balance_history_liability_id ON liability_balance_history(liability_id);
CREATE INDEX IF NOT EXISTS idx_liability_balance_history_user_id ON liability_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_liability_balance_history_created_at ON liability_balance_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE liability_balance_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own liability balance history
CREATE POLICY "Users can view their own liability balance history" ON liability_balance_history
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own liability balance history
CREATE POLICY "Users can create their own liability balance history" ON liability_balance_history
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users cannot update liability balance history (history is immutable)
-- No UPDATE policy - history should be append-only

-- Policy: Users cannot delete liability balance history (history is immutable)
-- No DELETE policy - history should be append-only

-- Create rollback function for easy migration reversal
CREATE OR REPLACE FUNCTION rollback_liability_balance_history_migration()
RETURNS void AS $$
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "Users can create their own liability balance history" ON liability_balance_history;
  DROP POLICY IF EXISTS "Users can view their own liability balance history" ON liability_balance_history;

  -- Disable RLS
  ALTER TABLE liability_balance_history DISABLE ROW LEVEL SECURITY;

  -- Drop indexes
  DROP INDEX IF EXISTS idx_liability_balance_history_created_at;
  DROP INDEX IF EXISTS idx_liability_balance_history_user_id;
  DROP INDEX IF EXISTS idx_liability_balance_history_liability_id;

  -- Drop table
  DROP TABLE IF EXISTS liability_balance_history;

  RAISE NOTICE 'Successfully rolled back liability_balance_history migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_liability_balance_history_migration() IS 'Rollback function for liability_balance_history migration - call with SELECT rollback_liability_balance_history_migration();';

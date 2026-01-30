-- Migration: Add paid_to_account_id to income table
-- Description: Adds a foreign key column to link income to the account it is paid to
-- Prerequisites: Requires accounts table to exist with id column
-- Rollback: ALTER TABLE income DROP COLUMN IF EXISTS paid_to_account_id;

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add the foreign key column
-- Use a safe approach - add column first, then add constraint separately if needed
ALTER TABLE income
ADD COLUMN IF NOT EXISTS paid_to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Add column comment
COMMENT ON COLUMN income.paid_to_account_id IS 'Foreign key to accounts table - specifies which account the income is paid to (optional)';

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_income_paid_to_account_id ON income(paid_to_account_id);

-- Step 3: Verify RLS policies allow proper access
-- The existing RLS policies should work fine with the new column since it's a foreign key to accounts table
-- and the policies are user-based. However, let's ensure SELECT policies can access the related account data.

-- The existing policies in the income table should be sufficient:
-- - "Users can view their own income" (SELECT)
-- - "Users can create their own income" (INSERT)
-- - "Users can update their own income" (UPDATE)
-- - "Users can delete their own income" (DELETE)

-- All policies use user_id checks, and the foreign key constraint ensures referential integrity.

-- Step 4: Add data validation note
-- Existing income will have NULL for paid_to_account_id, which is acceptable since it's optional
-- New income can optionally specify which account they are paid to

-- Migration verification
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check if column was added successfully
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'income'
    AND column_name = 'paid_to_account_id'
  ) INTO column_exists;

  IF NOT column_exists THEN
    RAISE EXCEPTION 'Column paid_to_account_id was not added to income table';
  END IF;

  RAISE NOTICE 'Migration successful: added paid_to_account_id column to income table';
END $$;

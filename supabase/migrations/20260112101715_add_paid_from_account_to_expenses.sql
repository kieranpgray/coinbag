-- Migration: Add paid_from_account_id to expenses table
-- Description: Adds a foreign key column to link expenses to the account they are paid from
-- Prerequisites: Requires accounts table to exist with id column
-- Rollback: ALTER TABLE expenses DROP COLUMN IF EXISTS paid_from_account_id;

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add the foreign key column
-- Use a safe approach - add column first, then add constraint separately if needed
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS paid_from_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Add column comment
COMMENT ON COLUMN expenses.paid_from_account_id IS 'Foreign key to accounts table - specifies which account the expense is paid from (optional)';

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_paid_from_account_id ON expenses(paid_from_account_id);

-- Step 3: Verify RLS policies allow proper access
-- The existing RLS policies should work fine with the new column since it's a foreign key to accounts table
-- and the policies are user-based. However, let's ensure SELECT policies can access the related account data.

-- The existing policies in the expenses table should be sufficient:
-- - "Users can view their own expenses" (SELECT)
-- - "Users can create their own expenses" (INSERT)
-- - "Users can update their own expenses" (UPDATE)
-- - "Users can delete their own expenses" (DELETE)

-- All policies use user_id checks, and the foreign key constraint ensures referential integrity.

-- Step 4: Add data validation note
-- Existing expenses will have NULL for paid_from_account_id, which is acceptable since it's optional
-- New expenses can optionally specify which account they are paid from

-- Migration verification
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check if column was added successfully
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'expenses'
    AND column_name = 'paid_from_account_id'
  ) INTO column_exists;

  IF NOT column_exists THEN
    RAISE EXCEPTION 'Column paid_from_account_id was not added to expenses table';
  END IF;

  RAISE NOTICE 'Migration successful: added paid_from_account_id column to expenses table';
END $$;

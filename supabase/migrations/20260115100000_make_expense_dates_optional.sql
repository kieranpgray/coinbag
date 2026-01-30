-- Migration: Make expense date fields optional
-- Description: Changes charge_date and next_due_date from NOT NULL to nullable to match income forms
-- Prerequisites: Requires existing expenses table
-- Rollback: See rollback function at end of file

-- ============================================================================
-- MIGRATION: Make expense date fields optional
-- ============================================================================

-- Step 1: Data validation - verify table exists and has data
DO $$
DECLARE
  row_count integer;
BEGIN
  IF to_regclass('public.expenses') IS NULL THEN
    RAISE EXCEPTION 'Expenses table does not exist. Cannot proceed with migration.';
  END IF;

  SELECT COUNT(*) INTO row_count FROM expenses;
  RAISE NOTICE 'Found % rows in expenses table', row_count;
END $$;

-- Step 2: Make charge_date nullable
ALTER TABLE expenses ALTER COLUMN charge_date DROP NOT NULL;
COMMENT ON COLUMN expenses.charge_date IS 'Original charge date for the expense (optional)';

-- Step 3: Make next_due_date nullable
ALTER TABLE expenses ALTER COLUMN next_due_date DROP NOT NULL;
COMMENT ON COLUMN expenses.next_due_date IS 'Next billing date (optional)';

-- ============================================================================
-- VERIFICATION: Check that columns are now nullable
-- ============================================================================

-- Verification query (run separately to confirm)
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'expenses' AND column_name IN ('charge_date', 'next_due_date');
-- Expected result: is_nullable should be 'YES' for both columns

-- ============================================================================
-- ROLLBACK (if needed):
-- ============================================================================

-- CREATE OR REPLACE FUNCTION rollback_make_expense_dates_optional()
-- RETURNS void AS $$
-- BEGIN
--   -- Make charge_date NOT NULL again
--   ALTER TABLE expenses ALTER COLUMN charge_date SET NOT NULL;
--   COMMENT ON COLUMN expenses.charge_date IS 'Original charge date for the expense';
--
--   -- Make next_due_date NOT NULL again
--   ALTER TABLE expenses ALTER COLUMN next_due_date SET NOT NULL;
--   COMMENT ON COLUMN expenses.next_due_date IS 'Next billing date';
--
--   RAISE NOTICE 'Successfully rolled back expense dates optional migration';
-- END;
-- $$ language 'plpgsql';

-- ============================================================================
-- MANUAL EXECUTION INSTRUCTIONS
-- ============================================================================
--
-- To run this migration manually:
--
-- Option 1: Using Supabase CLI
-- 1. Ensure you're linked to the correct project: supabase link --project-ref <project-ref>
-- 2. Run: supabase db push
--
-- Option 2: Using Supabase Dashboard
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste the migration content (excluding this comment block)
-- 4. Click "Run" or press Cmd/Ctrl + Enter
--
-- After running, verify the changes with:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'expenses' AND column_name IN ('charge_date', 'next_due_date');

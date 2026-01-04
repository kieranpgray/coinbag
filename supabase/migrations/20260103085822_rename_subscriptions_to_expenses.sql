-- Migration: Rename subscriptions table to expenses
-- Description: Renames the subscriptions table to expenses to better reflect that it stores all recurring expenses, not just subscriptions
-- Prerequisites: Requires existing subscriptions table with category_id foreign key
-- Rollback: See rollback function at end of file

-- Step 1: Data validation - verify table exists and has data
DO $$
DECLARE
  row_count integer;
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE EXCEPTION 'Subscriptions table does not exist. Cannot proceed with migration.';
  END IF;
  
  SELECT COUNT(*) INTO row_count FROM subscriptions;
  RAISE NOTICE 'Found % rows in subscriptions table', row_count;
END $$;

-- Step 2: Drop existing trigger (will recreate with new name)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Step 3: Drop existing RLS policies (will recreate with new names)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;

-- Step 4: Rename indexes (PostgreSQL will automatically update foreign key constraint references)
DROP INDEX IF EXISTS idx_subscriptions_frequency;
DROP INDEX IF EXISTS idx_subscriptions_category_id;
DROP INDEX IF EXISTS idx_subscriptions_next_due_date;
DROP INDEX IF EXISTS idx_subscriptions_user_id;

-- Step 5: Rename the table
ALTER TABLE subscriptions RENAME TO expenses;

-- Step 6: Recreate indexes with new names
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_next_due_date ON expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);

-- Step 7: Recreate trigger with new name
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Recreate RLS policies with updated names
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can create their own expenses" ON expenses
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Step 9: Update table and column comments
COMMENT ON TABLE expenses IS 'Recurring expenses for users (includes subscriptions, bills, savings, repayments, living, and lifestyle expenses)';
COMMENT ON COLUMN expenses.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN expenses.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN expenses.name IS 'Display name of the expense';
COMMENT ON COLUMN expenses.amount IS 'Expense amount in dollars';
COMMENT ON COLUMN expenses.frequency IS 'Billing frequency: weekly, fortnightly, monthly, quarterly, yearly';
COMMENT ON COLUMN expenses.charge_date IS 'Original charge date for the expense';
COMMENT ON COLUMN expenses.next_due_date IS 'Next billing date';
COMMENT ON COLUMN expenses.category_id IS 'Foreign key to categories table';
COMMENT ON COLUMN expenses.notes IS 'Optional notes about the expense';
COMMENT ON COLUMN expenses.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN expenses.updated_at IS 'Last update timestamp';

-- Step 10: Create backward compatibility view (temporary, can be removed after frontend migration)
CREATE OR REPLACE VIEW subscriptions AS SELECT * FROM expenses;
COMMENT ON VIEW subscriptions IS 'Backward compatibility view for subscriptions table - use expenses table instead';

-- Step 11: Verify migration success
DO $$
DECLARE
  row_count integer;
  view_count integer;
BEGIN
  SELECT COUNT(*) INTO row_count FROM expenses;
  SELECT COUNT(*) INTO view_count FROM subscriptions;
  
  IF row_count != view_count THEN
    RAISE EXCEPTION 'Data mismatch: expenses table has % rows but subscriptions view has % rows', row_count, view_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: % rows migrated from subscriptions to expenses', row_count;
END $$;

-- Rollback function
CREATE OR REPLACE FUNCTION rollback_subscriptions_to_expenses_migration()
RETURNS void AS $$
BEGIN
  -- Drop backward compatibility view
  DROP VIEW IF EXISTS subscriptions;
  
  -- Drop trigger
  DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
  
  -- Drop policies
  DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can create their own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
  
  -- Drop indexes
  DROP INDEX IF EXISTS idx_expenses_frequency;
  DROP INDEX IF EXISTS idx_expenses_category_id;
  DROP INDEX IF EXISTS idx_expenses_next_due_date;
  DROP INDEX IF EXISTS idx_expenses_user_id;
  
  -- Rename table back
  ALTER TABLE expenses RENAME TO subscriptions;
  
  -- Recreate indexes
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_next_due_date ON subscriptions(next_due_date);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_frequency ON subscriptions(frequency);
  
  -- Recreate trigger
  CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  -- Recreate policies
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
  
  -- Restore comments
  COMMENT ON TABLE subscriptions IS 'Recurring subscriptions and expenses for users';
  COMMENT ON COLUMN subscriptions.category_id IS 'Foreign key to categories table';
  
  RAISE NOTICE 'Successfully rolled back expenses to subscriptions migration';
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION rollback_subscriptions_to_expenses_migration() IS 'Rollback function for subscriptions to expenses migration - call with SELECT rollback_subscriptions_to_expenses_migration();';


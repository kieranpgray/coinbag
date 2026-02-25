-- Migration: Add quarterly frequency to expenses table
-- Description: Updates the frequency CHECK constraint to include 'quarterly' to match the contract and template support
-- Prerequisites: Requires expenses table from previous migrations
-- Rollback: ALTER TABLE expenses DROP CONSTRAINT expenses_frequency_check; ALTER TABLE expenses ADD CONSTRAINT expenses_frequency_check CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly'));

-- Drop the existing frequency constraint (may have been inherited from subscriptions table)
-- Constraint name could be 'subscriptions_frequency_check' or auto-generated
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Try to find and drop the frequency constraint on expenses table
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'expenses'
    AND att.attname = 'frequency'
    AND con.contype = 'c'; -- check constraint

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE expenses DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Dropped existing frequency constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No existing frequency constraint found on expenses table';
  END IF;
END $$;

-- Add new constraint with quarterly support
ALTER TABLE expenses ADD CONSTRAINT expenses_frequency_check
  CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'));

-- Add comment to document the change
COMMENT ON CONSTRAINT expenses_frequency_check ON expenses IS 'Valid frequency values for expenses (updated to include quarterly)';

-- Verify the constraint was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'expenses'
      AND con.conname = 'expenses_frequency_check'
      AND con.contype = 'c'
  ) THEN
    RAISE EXCEPTION 'expenses_frequency_check constraint was not created successfully';
  END IF;

  RAISE NOTICE 'Migration successful: added expenses_frequency_check constraint with quarterly support';
END $$;
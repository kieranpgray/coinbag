-- Migration: Make next_payment_date column nullable in income table
-- Description: Changes the next_payment_date column from NOT NULL to nullable to support optional payment dates
-- Prerequisites: Income table must exist
-- Rollback: ALTER TABLE income ALTER COLUMN next_payment_date SET NOT NULL;

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Make next_payment_date column nullable
ALTER TABLE income ALTER COLUMN next_payment_date DROP NOT NULL;

-- Add/update column comment
COMMENT ON COLUMN income.next_payment_date IS 'Next payment date (optional - NULL means no specific payment date set)';

-- Migration verification
DO $$
DECLARE
  column_nullable boolean;
BEGIN
  -- Check if column is now nullable
  SELECT NOT is_nullable = 'NO'
  INTO column_nullable
  FROM information_schema.columns
  WHERE table_name = 'income'
    AND column_name = 'next_payment_date';

  IF NOT column_nullable THEN
    RAISE EXCEPTION 'Column next_payment_date should be nullable but is not';
  END IF;

  RAISE NOTICE 'Migration successful: next_payment_date column is now nullable';
END $$;

-- Rollback: ALTER TABLE income ALTER COLUMN next_payment_date SET NOT NULL;




-- Migration: Ensure institution column is optional across all relevant tables
-- Description: Makes the institution column nullable in accounts, assets, and liabilities tables
-- to ensure consistency and allow users to create records without specifying an institution.
-- This migration is idempotent and safe to run multiple times.
-- Rollback: ALTER TABLE accounts ALTER COLUMN institution SET NOT NULL; (may fail if null values exist)

-- Check if institution column exists and is NOT NULL in accounts table, then make it nullable
DO $$
BEGIN
  -- Check if the accounts table has institution as NOT NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'accounts'
    AND column_name = 'institution'
    AND is_nullable = 'NO'
  ) THEN
    -- Make institution nullable in accounts table
    ALTER TABLE accounts ALTER COLUMN institution DROP NOT NULL;
    RAISE NOTICE 'Made institution column nullable in accounts table';
  ELSE
    RAISE NOTICE 'Institution column in accounts table is already nullable or does not exist';
  END IF;
END $$;

-- Ensure assets table has institution as nullable (safeguard)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'assets'
    AND column_name = 'institution'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE assets ALTER COLUMN institution DROP NOT NULL;
    RAISE NOTICE 'Made institution column nullable in assets table';
  ELSE
    RAISE NOTICE 'Institution column in assets table is already nullable or does not exist';
  END IF;
END $$;

-- Ensure liabilities table has institution as nullable (safeguard)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'liabilities'
    AND column_name = 'institution'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE liabilities ALTER COLUMN institution DROP NOT NULL;
    RAISE NOTICE 'Made institution column nullable in liabilities table';
  ELSE
    RAISE NOTICE 'Institution column in liabilities table is already nullable or does not exist';
  END IF;
END $$;

-- Update column comments for clarity
COMMENT ON COLUMN accounts.institution IS 'Bank or financial institution name (optional)';
COMMENT ON COLUMN assets.institution IS 'Optional institution name';
COMMENT ON COLUMN liabilities.institution IS 'Optional institution name (e.g., bank, lender)';

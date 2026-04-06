-- Migration: Expand liability type stored values (Wave 3.2 liability type granularity)
-- Description: Replaces 3 broad liability categories with 6 granular named types.
-- Old values: Loans, Credit Cards, Other
-- New values: Home loan, Personal loan, Car loan, Credit card, HECS / HELP debt, Other liability
-- Data migration: Loans→Home loan, Credit Cards→Credit card, Other→Other liability

-- 1. Drop existing CHECK, add updated one NOT VALID
ALTER TABLE liabilities
  DROP CONSTRAINT IF EXISTS liabilities_type_check;

ALTER TABLE liabilities
  ADD CONSTRAINT liabilities_type_check
  CHECK (type IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS / HELP debt', 'Other liability'))
  NOT VALID;

-- 2. Migrate existing data (disable RLS to bypass user scoping)
ALTER TABLE liabilities DISABLE ROW LEVEL SECURITY;

UPDATE liabilities SET type = 'Home loan'      WHERE type = 'Loans';
UPDATE liabilities SET type = 'Credit card'    WHERE type = 'Credit Cards';
UPDATE liabilities SET type = 'Other liability' WHERE type = 'Other';

-- Trim any stray whitespace and catch any remaining unrecognised values
UPDATE liabilities SET type = TRIM(type) WHERE type IS NOT NULL AND type <> TRIM(type);
UPDATE liabilities SET type = 'Other liability'
  WHERE type IS NOT NULL
  AND type NOT IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS / HELP debt', 'Other liability');

ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

-- 3. Validate constraint against migrated data
ALTER TABLE liabilities VALIDATE CONSTRAINT liabilities_type_check;

COMMENT ON COLUMN liabilities.type IS 'Liability type: Home loan, Personal loan, Car loan, Credit card, HECS / HELP debt, Other liability';

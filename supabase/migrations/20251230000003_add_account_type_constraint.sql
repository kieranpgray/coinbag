-- Migration: Add account type constraint to accounts table
-- Description: Adds CHECK constraint for valid account types per PRD
-- Rollback: ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

-- Drop existing constraint if it exists (in case it was added differently)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

-- Add CHECK constraint for valid account types per PRD
ALTER TABLE accounts 
ADD CONSTRAINT accounts_account_type_check 
CHECK (account_type IN (
  'Checking',
  'Savings',
  'Credit Card',
  'Loan',
  'Investment',
  'Crypto',
  'Other'
));

-- Add comment
COMMENT ON CONSTRAINT accounts_account_type_check ON accounts IS 'Validates account type matches PRD values';


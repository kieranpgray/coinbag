-- Migration: Update account types constraint
-- Description: Updates account type constraint to remove Investment/Crypto and rename Checking to Bank Account
-- Rollback: Run previous migration to restore old values

-- Drop existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

-- Update existing 'Checking' records to 'Bank Account' (if any exist)
UPDATE accounts 
SET account_type = 'Bank Account' 
WHERE account_type = 'Checking';

-- Update existing 'Investment' records to 'Other' (if any exist)
UPDATE accounts 
SET account_type = 'Other' 
WHERE account_type = 'Investment';

-- Update existing 'Crypto' records to 'Other' (if any exist)
UPDATE accounts 
SET account_type = 'Other' 
WHERE account_type = 'Crypto';

-- Add updated CHECK constraint for valid account types
ALTER TABLE accounts 
ADD CONSTRAINT accounts_account_type_check 
CHECK (account_type IN (
  'Bank Account',
  'Savings',
  'Credit Card',
  'Loan',
  'Other'
));

-- Add comment
COMMENT ON CONSTRAINT accounts_account_type_check ON accounts IS 'Validates account type matches updated PRD values';


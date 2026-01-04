-- Migration: Add credit limit and balance owed fields to accounts table
-- Description: Adds credit_limit and balance_owed columns for credit cards and loans
-- Rollback: ALTER TABLE accounts DROP COLUMN IF EXISTS credit_limit; ALTER TABLE accounts DROP COLUMN IF EXISTS balance_owed;

-- Add credit_limit column (for credit cards/loans)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS credit_limit numeric(10,2) CHECK (credit_limit >= 0);

-- Add balance_owed column (for credit cards/loans - always positive)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS balance_owed numeric(10,2) CHECK (balance_owed >= 0);

-- Add column comments
COMMENT ON COLUMN accounts.credit_limit IS 'Credit limit for credit cards/loans (original loan amount)';
COMMENT ON COLUMN accounts.balance_owed IS 'Balance owed for credit cards/loans (positive number)';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_accounts_credit_limit ON accounts(credit_limit) WHERE credit_limit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_balance_owed ON accounts(balance_owed) WHERE balance_owed IS NOT NULL;


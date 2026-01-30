-- Migration: Add composite index for optimized duplicate transaction check
-- Description: Creates a composite index on (account_id, date, transaction_reference) to dramatically improve duplicate check query performance
-- This index enables fast lookups when checking for duplicate transactions within a date range
-- Rollback: DROP INDEX IF EXISTS idx_transactions_duplicate_check;

-- Create composite index for duplicate check optimization
-- This index supports queries filtering by account_id, date range, and transaction_reference
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check 
ON transactions(account_id, date DESC, transaction_reference)
WHERE transaction_reference IS NOT NULL;

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_transactions_duplicate_check IS 
'Composite index for fast duplicate transaction checks. Supports queries filtering by account_id and date range, with transaction_reference for exact matching. DESC on date enables efficient range queries for recent transactions.';


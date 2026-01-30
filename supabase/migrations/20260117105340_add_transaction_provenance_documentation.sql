-- Migration: Add transaction provenance documentation and optimizations
-- Description: Adds documentation and optimizations for transaction provenance filtering
-- Prerequisites: transactions table must exist
-- Rollback: Remove comments and indexes

-- CRITICAL: Transaction Provenance Requirements
-- 
-- All transactions shown in production UI must have statement_import_id set.
-- This ensures only factual OCR-extracted transactions are displayed, preventing
-- mock/test/manual transactions from appearing in production views.
--
-- Filtering behavior:
-- - When statementImportId is provided: show ONLY transactions from that specific import
-- - In production without statementImportId: show ONLY transactions with statement_import_id IS NOT NULL
-- - In development: all transactions are visible (for testing)
--
-- Repository layer enforces these rules at query time.

-- Add comment to statement_import_id column documenting provenance requirement
COMMENT ON COLUMN transactions.statement_import_id IS 'Foreign key to statement_imports table. CRITICAL: Required for production UI - transactions without this are filtered out in production views to prevent showing mock/test data.';

-- Create partial index for production queries (transactions with statement_import_id)
-- This improves performance when filtering by statement_import_id or when querying
-- production views that only show transactions with provenance
CREATE INDEX IF NOT EXISTS idx_transactions_with_provenance 
  ON transactions(account_id, date DESC, statement_import_id) 
  WHERE statement_import_id IS NOT NULL;

-- Add index comment
COMMENT ON INDEX idx_transactions_with_provenance IS 'Partial index for transactions with statement_import_id (provenance). Optimizes production queries that filter by provenance.';

-- Note: We do NOT add a constraint requiring statement_import_id because:
-- 1. Development/testing may need to create manual transactions
-- 2. Legacy data may not have statement_import_id
-- 3. The repository layer enforces filtering at query time
-- This provides flexibility while ensuring production data integrity.





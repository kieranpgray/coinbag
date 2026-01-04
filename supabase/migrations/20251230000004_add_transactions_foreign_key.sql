-- Migration: Add foreign key from transactions to statement_imports
-- Description: Adds the foreign key constraint after both tables exist
-- Rollback: ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_statement_import_id_fkey;

-- Add foreign key constraint
ALTER TABLE transactions
ADD CONSTRAINT transactions_statement_import_id_fkey
FOREIGN KEY (statement_import_id) 
REFERENCES statement_imports(id) 
ON DELETE SET NULL;


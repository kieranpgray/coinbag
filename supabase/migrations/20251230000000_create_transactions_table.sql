-- Migration: Create transactions table with RLS policies
-- Description: Creates the transactions table for statement-based transaction imports
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text,
  transaction_reference text, -- PRD requirement: unique reference from statement
  statement_import_id uuid, -- Foreign key added after statement_imports table is created
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE transactions IS 'Financial transactions imported from statements';

-- Add column comments
COMMENT ON COLUMN transactions.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN transactions.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN transactions.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN transactions.date IS 'Transaction date';
COMMENT ON COLUMN transactions.description IS 'Transaction description/merchant name';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount (positive for income, negative for expense)';
COMMENT ON COLUMN transactions.type IS 'Transaction type: income or expense';
COMMENT ON COLUMN transactions.category IS 'Optional category for the transaction';
COMMENT ON COLUMN transactions.transaction_reference IS 'Unique reference from statement (PRD requirement)';
COMMENT ON COLUMN transactions.statement_import_id IS 'Foreign key to statement_imports table';
COMMENT ON COLUMN transactions.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN transactions.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_import_id ON transactions(statement_import_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(statement_import_id) WHERE statement_import_id IS NOT NULL;
-- Index for deduplication: account_id + transaction_reference + date
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupe ON transactions(account_id, transaction_reference, date) WHERE transaction_reference IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own transactions
CREATE POLICY "Users can create their own transactions" ON transactions
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Create trigger for automatic updated_at updates on transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


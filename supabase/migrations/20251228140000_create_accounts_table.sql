-- Migration: Create accounts table with RLS policies
-- Description: Creates the accounts table for the Moneybags application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  institution text NOT NULL,
  account_name text NOT NULL,
  balance numeric(10,2) NOT NULL,
  available_balance numeric(10,2) NOT NULL,
  account_type text NOT NULL,
  last_updated timestamp with time zone NOT NULL,
  hidden boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE accounts IS 'Financial accounts (bank accounts, credit cards, etc.) for users';

-- Add column comments
COMMENT ON COLUMN accounts.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN accounts.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN accounts.institution IS 'Bank or financial institution name';
COMMENT ON COLUMN accounts.account_name IS 'Display name of the account';
COMMENT ON COLUMN accounts.balance IS 'Current account balance in dollars';
COMMENT ON COLUMN accounts.available_balance IS 'Available balance (after holds) in dollars';
COMMENT ON COLUMN accounts.account_type IS 'Account type (e.g., Checking, Savings, Credit Card)';
COMMENT ON COLUMN accounts.last_updated IS 'Last time account data was updated';
COMMENT ON COLUMN accounts.hidden IS 'Whether the account is hidden from dashboard';
COMMENT ON COLUMN accounts.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN accounts.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_hidden ON accounts(hidden);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own accounts
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own accounts
CREATE POLICY "Users can create their own accounts" ON accounts
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete their own accounts" ON accounts
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Create function for updating updated_at timestamp (reuse existing function if it exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates on accounts
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


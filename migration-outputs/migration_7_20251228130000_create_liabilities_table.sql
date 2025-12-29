-- Migration: Create liabilities table with RLS policies
-- Description: Creates the liabilities table for the Coinbag application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create liabilities table
CREATE TABLE IF NOT EXISTS liabilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Loans', 'Credit Cards', 'Other')),
  balance numeric(10,2) NOT NULL CHECK (balance >= 0),
  interest_rate numeric(5,2) CHECK (interest_rate >= 0 AND interest_rate <= 100),
  monthly_payment numeric(10,2) CHECK (monthly_payment >= 0),
  due_date date,
  institution text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE liabilities IS 'Financial liabilities (debts) for users';

-- Add column comments
COMMENT ON COLUMN liabilities.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN liabilities.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN liabilities.name IS 'Display name of the liability';
COMMENT ON COLUMN liabilities.type IS 'Liability type: Loans, Credit Cards, Other';
COMMENT ON COLUMN liabilities.balance IS 'Current balance owed in dollars';
COMMENT ON COLUMN liabilities.interest_rate IS 'Annual interest rate percentage (0-100)';
COMMENT ON COLUMN liabilities.monthly_payment IS 'Monthly payment amount in dollars';
COMMENT ON COLUMN liabilities.due_date IS 'Next payment due date';
COMMENT ON COLUMN liabilities.institution IS 'Optional institution name (e.g., bank, lender)';
COMMENT ON COLUMN liabilities.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN liabilities.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_type ON liabilities(type);
CREATE INDEX IF NOT EXISTS idx_liabilities_due_date ON liabilities(due_date);

-- Enable Row Level Security
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own liabilities
CREATE POLICY "Users can view their own liabilities" ON liabilities
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own liabilities
CREATE POLICY "Users can create their own liabilities" ON liabilities
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own liabilities
CREATE POLICY "Users can update their own liabilities" ON liabilities
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own liabilities
CREATE POLICY "Users can delete their own liabilities" ON liabilities
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

-- Create trigger for automatic updated_at updates on liabilities
CREATE TRIGGER update_liabilities_updated_at
  BEFORE UPDATE ON liabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (Supabase handles most of this automatically)
-- These are typically managed by Supabase's service role


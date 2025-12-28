-- Migration: Create income table with RLS policies
-- Description: Creates the income table for the Moneybags application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create income table
CREATE TABLE IF NOT EXISTS income (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  name text NOT NULL,
  source text NOT NULL CHECK (source IN ('Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other')),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  next_payment_date date NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE income IS 'Income sources for users';

-- Add column comments
COMMENT ON COLUMN income.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN income.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN income.name IS 'Display name of the income source';
COMMENT ON COLUMN income.source IS 'Income source type: Salary, Freelance, Business, Investments, Rental, Other';
COMMENT ON COLUMN income.amount IS 'Income amount in dollars';
COMMENT ON COLUMN income.frequency IS 'Payment frequency: weekly, fortnightly, monthly, yearly';
COMMENT ON COLUMN income.next_payment_date IS 'Next payment date';
COMMENT ON COLUMN income.notes IS 'Optional notes about the income source';
COMMENT ON COLUMN income.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN income.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
CREATE INDEX IF NOT EXISTS idx_income_next_payment_date ON income(next_payment_date);

-- Enable Row Level Security
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own income
CREATE POLICY "Users can view their own income" ON income
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own income
CREATE POLICY "Users can create their own income" ON income
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own income
CREATE POLICY "Users can update their own income" ON income
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own income
CREATE POLICY "Users can delete their own income" ON income
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

-- Create trigger for automatic updated_at updates on income
CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- Migration: Create net_worth_history table with RLS policies
-- Description: Creates the net_worth_history table for storing daily net worth snapshots
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create net_worth_history table
CREATE TABLE IF NOT EXISTS net_worth_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  date date NOT NULL,
  net_worth numeric(10,2) NOT NULL,
  total_assets numeric(10,2) NOT NULL,
  total_liabilities numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Add table comment
COMMENT ON TABLE net_worth_history IS 'Daily net worth snapshots for users';

-- Add column comments
COMMENT ON COLUMN net_worth_history.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN net_worth_history.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN net_worth_history.date IS 'Date of the snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN net_worth_history.net_worth IS 'Net worth value in dollars';
COMMENT ON COLUMN net_worth_history.total_assets IS 'Total assets value in dollars';
COMMENT ON COLUMN net_worth_history.total_liabilities IS 'Total liabilities value in dollars';
COMMENT ON COLUMN net_worth_history.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN net_worth_history.updated_at IS 'Last update timestamp';

-- Indexes for performance (composite index for date range queries)
CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_id ON net_worth_history(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_date ON net_worth_history(user_id, date DESC);

-- RLS policies
ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own net worth history"
  ON net_worth_history FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert their own net worth history"
  ON net_worth_history FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update their own net worth history"
  ON net_worth_history FOR UPDATE
  USING (auth.jwt() ->> 'sub' = user_id)
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Function to create/update a snapshot for a specific user
-- NOTE: This function is called from application code with user context
-- It does NOT use SECURITY DEFINER to avoid privilege escalation
-- The function accepts user_id as a parameter for explicit user context
CREATE OR REPLACE FUNCTION create_net_worth_snapshot(
  p_user_id text,
  p_date date,
  p_net_worth numeric(10,2),
  p_total_assets numeric(10,2),
  p_total_liabilities numeric(10,2)
)
RETURNS void AS $$
BEGIN
  INSERT INTO net_worth_history (user_id, date, net_worth, total_assets, total_liabilities)
  VALUES (p_user_id, p_date, p_net_worth, p_total_assets, p_total_liabilities)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    net_worth = EXCLUDED.net_worth,
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_net_worth_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER net_worth_history_updated_at
  BEFORE UPDATE ON net_worth_history
  FOR EACH ROW
  EXECUTE FUNCTION update_net_worth_history_updated_at();

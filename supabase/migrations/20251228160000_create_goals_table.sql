-- Migration: Create goals table with RLS policies
-- Description: Creates the goals table for the Supafolio application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('Grow', 'Save', 'Pay Off', 'Invest')),
  source text,
  target_amount numeric(10,2) NOT NULL CHECK (target_amount >= 0),
  current_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE goals IS 'Financial goals for users';

-- Add column comments
COMMENT ON COLUMN goals.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN goals.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN goals.name IS 'Display name of the goal';
COMMENT ON COLUMN goals.description IS 'Optional description of the goal';
COMMENT ON COLUMN goals.type IS 'Goal type: Grow, Save, Pay Off, Invest';
COMMENT ON COLUMN goals.source IS 'Source of funds (e.g., "Net Worth", "Total Cash", "ANZ CC")';
COMMENT ON COLUMN goals.target_amount IS 'Target amount in dollars';
COMMENT ON COLUMN goals.current_amount IS 'Current progress toward target amount';
COMMENT ON COLUMN goals.deadline IS 'Optional deadline date for the goal';
COMMENT ON COLUMN goals.status IS 'Goal status: active, completed, paused';
COMMENT ON COLUMN goals.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN goals.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own goals
CREATE POLICY "Users can view their own goals" ON goals
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own goals
CREATE POLICY "Users can create their own goals" ON goals
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own goals
CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own goals
CREATE POLICY "Users can delete their own goals" ON goals
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

-- Create trigger for automatic updated_at updates on goals
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


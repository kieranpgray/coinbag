-- Migration: Create subscriptions table with RLS policies
-- Description: Creates the subscriptions table for the Moneybags application
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  charge_date date NOT NULL,
  next_due_date date NOT NULL,
  category text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE subscriptions IS 'Recurring subscriptions and expenses for users';

-- Add column comments
COMMENT ON COLUMN subscriptions.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN subscriptions.user_id IS 'Clerk user ID for RLS policies';
COMMENT ON COLUMN subscriptions.name IS 'Display name of the subscription';
COMMENT ON COLUMN subscriptions.amount IS 'Subscription amount in dollars';
COMMENT ON COLUMN subscriptions.frequency IS 'Billing frequency: weekly, fortnightly, monthly, yearly';
COMMENT ON COLUMN subscriptions.charge_date IS 'Original charge date for the subscription';
COMMENT ON COLUMN subscriptions.next_due_date IS 'Next billing date';
COMMENT ON COLUMN subscriptions.category IS 'Subscription category for organization';
COMMENT ON COLUMN subscriptions.notes IS 'Optional notes about the subscription';
COMMENT ON COLUMN subscriptions.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN subscriptions.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_due_date ON subscriptions(next_due_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_frequency ON subscriptions(frequency);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own subscriptions
CREATE POLICY "Users can create their own subscriptions" ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions" ON subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (Supabase handles most of this automatically)
-- These are typically managed by Supabase's service role

-- Create rollback function for easy migration reversal
CREATE OR REPLACE FUNCTION rollback_subscriptions_migration()
RETURNS void AS $$
BEGIN
  -- Drop trigger first
  DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

  -- Drop function
  DROP FUNCTION IF EXISTS update_updated_at_column();

  -- Drop policies
  DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can create their own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

  -- Disable RLS
  ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

  -- Drop indexes
  DROP INDEX IF EXISTS idx_subscriptions_frequency;
  DROP INDEX IF EXISTS idx_subscriptions_category;
  DROP INDEX IF EXISTS idx_subscriptions_next_due_date;
  DROP INDEX IF EXISTS idx_subscriptions_user_id;

  -- Drop table
  DROP TABLE IF EXISTS subscriptions;

  RAISE NOTICE 'Successfully rolled back subscriptions migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_subscriptions_migration() IS 'Rollback function for subscriptions migration - call with SELECT rollback_subscriptions_migration();';

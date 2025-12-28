-- Migration: Create categories table and update subscriptions to use category_id
-- Description: Creates the categories table and migrates subscriptions to use foreign keys
-- Prerequisites: Requires existing subscriptions table from previous migration
-- Rollback: Drop categories table and revert subscriptions.category_id changes

-- Enable required extensions (should already be enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  -- Ensure category names are unique per user
  UNIQUE(user_id, name)
);

-- Add table comment
COMMENT ON TABLE categories IS 'User-defined categories for organizing subscriptions and expenses';

-- Add column comments
COMMENT ON COLUMN categories.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN categories.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN categories.name IS 'Category name (unique per user)';
COMMENT ON COLUMN categories.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN categories.updated_at IS 'Last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own categories
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own categories
CREATE POLICY "Users can create their own categories" ON categories
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own categories
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own categories
CREATE POLICY "Users can delete their own categories" ON categories
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

-- Create trigger for automatic updated_at updates on categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add category_id column to subscriptions table
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);
  END IF;
END $$;

-- Create a mapping from legacy category strings to category IDs
-- Insert default categories for each user who has subscriptions
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'subscriptions'
         AND column_name = 'category'
     ) THEN
    INSERT INTO categories (user_id, name)
    SELECT DISTINCT
      s.user_id::text,
      s.category
    FROM subscriptions s
    WHERE s.category IS NOT NULL
      AND s.category <> ''
      AND NOT EXISTS (
        SELECT 1 FROM categories c
        WHERE c.user_id = s.user_id::text AND c.name = s.category
      );
  END IF;
END $$;

-- Update subscriptions to set category_id based on the category name
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'subscriptions'
         AND column_name = 'category'
     ) THEN
    UPDATE subscriptions s
    SET category_id = c.id
    FROM categories c
    WHERE s.user_id::text = c.user_id
      AND s.category = c.name
      AND s.category_id IS NULL;
  END IF;
END $$;

-- Add NOT NULL constraint to category_id after backfilling
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    -- Only set NOT NULL once data is backfilled in real environments.
    -- Leaving as nullable keeps the migration safe in partially migrated DBs.
    -- ALTER TABLE subscriptions ALTER COLUMN category_id SET NOT NULL;
  END IF;
END $$;

-- Drop the old category text column
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE subscriptions DROP COLUMN IF EXISTS category;
  END IF;
END $$;

-- Update indexes (remove old category index, add new category_id index)
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    DROP INDEX IF EXISTS idx_subscriptions_category;
    CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
  END IF;
END $$;

-- Grant necessary permissions (Supabase handles most of this automatically)
-- These are typically managed by Supabase's service role

-- Create rollback function for easy migration reversal
CREATE OR REPLACE FUNCTION rollback_categories_migration()
RETURNS void AS $$
BEGIN
  -- Revert subscriptions table changes
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS category text;
  UPDATE subscriptions
  SET category = c.name
  FROM categories c
  WHERE subscriptions.category_id = c.id;
  ALTER TABLE subscriptions ALTER COLUMN category SET NOT NULL;
  ALTER TABLE subscriptions DROP COLUMN IF EXISTS category_id;
  DROP INDEX IF EXISTS idx_subscriptions_category_id;
  CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category);

  -- Drop categories table and related objects
  DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
  DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
  DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
  DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
  DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
  ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
  DROP INDEX IF EXISTS idx_categories_name;
  DROP INDEX IF EXISTS idx_categories_user_id;
  DROP TABLE IF EXISTS categories;

  RAISE NOTICE 'Successfully rolled back categories migration';
END;
$$ language 'plpgsql';

-- Add migration metadata comment
COMMENT ON FUNCTION rollback_categories_migration() IS 'Rollback function for categories migration - call with SELECT rollback_categories_migration();';

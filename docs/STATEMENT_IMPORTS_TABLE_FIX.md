# Statement Imports Table Fix

## Issue
Statement uploads are failing with error: "Could not find the table 'public.statement_imports' in the schema cache"

## Root Cause
The `statement_imports` table migration (`20251230000001_create_statement_imports_table.sql`) has not been executed in the development project.

## Solution

### SQL Migration to Execute

Go to: **https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/sql/new**

Copy and paste the following SQL:

```sql
-- Migration: Create statement_imports table with RLS policies
-- Description: Creates the statement_imports table for tracking statement uploads and imports
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: Drop table and related objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create statement_imports table
CREATE TABLE IF NOT EXISTS statement_imports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Clerk user id (JWT sub claim) is not a UUID; store as text.
  -- Defaulting to auth.jwt()->>'sub' lets the client omit user_id on insert.
  user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL, -- Path in storage bucket
  file_hash text NOT NULL, -- SHA-256 hash for deduplication
  file_size bigint NOT NULL, -- Size in bytes
  mime_type text NOT NULL, -- e.g., 'application/pdf', 'image/jpeg'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'review', 'completed', 'failed', 'cancelled')),
  parsing_method text CHECK (parsing_method IN ('deterministic', 'ocr', 'llm')),
  total_transactions integer DEFAULT 0,
  imported_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  confidence_score numeric(5,2), -- 0-100 confidence score for AI parsing
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb, -- Store parsing metadata, model info, etc.
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

-- Add table comment
COMMENT ON TABLE statement_imports IS 'Statement file uploads and import tracking';

-- Add column comments
COMMENT ON COLUMN statement_imports.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN statement_imports.user_id IS 'Clerk user ID (JWT sub claim) used for RLS policies';
COMMENT ON COLUMN statement_imports.account_id IS 'Foreign key to accounts table';
COMMENT ON COLUMN statement_imports.file_name IS 'Original filename';
COMMENT ON COLUMN statement_imports.file_path IS 'Path in storage bucket';
COMMENT ON COLUMN statement_imports.file_hash IS 'SHA-256 hash for deduplication';
COMMENT ON COLUMN statement_imports.file_size IS 'File size in bytes';
COMMENT ON COLUMN statement_imports.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN statement_imports.status IS 'Import status: pending, processing, review, completed, failed, cancelled';
COMMENT ON COLUMN statement_imports.parsing_method IS 'Parsing method used: deterministic, ocr, or llm';
COMMENT ON COLUMN statement_imports.total_transactions IS 'Total transactions found';
COMMENT ON COLUMN statement_imports.imported_transactions IS 'Successfully imported transactions';
COMMENT ON COLUMN statement_imports.failed_transactions IS 'Failed transactions';
COMMENT ON COLUMN statement_imports.confidence_score IS 'Confidence score (0-100) for AI parsing';
COMMENT ON COLUMN statement_imports.error_message IS 'Error message if import failed';
COMMENT ON COLUMN statement_imports.metadata IS 'JSON metadata (model info, parsing details, etc.)';
COMMENT ON COLUMN statement_imports.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN statement_imports.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN statement_imports.completed_at IS 'Completion timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_statement_imports_user_id ON statement_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_account_id ON statement_imports(account_id);
CREATE INDEX IF NOT EXISTS idx_statement_imports_status ON statement_imports(status);
CREATE INDEX IF NOT EXISTS idx_statement_imports_file_hash ON statement_imports(file_hash);
CREATE INDEX IF NOT EXISTS idx_statement_imports_created_at ON statement_imports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation

-- Policy: Users can view their own statement imports
CREATE POLICY "Users can view their own statement imports" ON statement_imports
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can create their own statement imports
CREATE POLICY "Users can create their own statement imports" ON statement_imports
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can update their own statement imports
CREATE POLICY "Users can update their own statement imports" ON statement_imports
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

-- Policy: Users can delete their own statement imports
CREATE POLICY "Users can delete their own statement imports" ON statement_imports
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

-- Create trigger for automatic updated_at updates on statement_imports
CREATE TRIGGER update_statement_imports_updated_at
  BEFORE UPDATE ON statement_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Verification

After running the migration, verify the table exists:

```bash
node scripts/create-statement-imports-table.js
```

Or check in Supabase Dashboard:
- Table Editor → Should see `statement_imports` table
- Storage → Policies → Should see RLS policies for statement_imports

## What This Migration Creates

1. **Table**: `statement_imports`
   - Tracks statement file uploads and imports
   - Links to accounts via foreign key
   - Stores file metadata (hash, size, path, etc.)
   - Tracks import status and progress

2. **Indexes** (5 indexes):
   - `idx_statement_imports_user_id`
   - `idx_statement_imports_account_id`
   - `idx_statement_imports_status`
   - `idx_statement_imports_file_hash`
   - `idx_statement_imports_created_at`

3. **RLS Policies** (4 policies):
   - Users can view their own statement imports
   - Users can create their own statement imports
   - Users can update their own statement imports
   - Users can delete their own statement imports

4. **Trigger**:
   - Automatically updates `updated_at` timestamp on row updates

## Next Steps

1. ✅ Storage bucket created - **COMPLETE**
2. ⏳ Create statement_imports table - **REQUIRES SQL EXECUTION**
3. ⏳ Verify table exists - **AFTER CREATION**
4. ⏳ Test upload functionality - **AFTER VERIFICATION**

## Files Modified

- `supabase/migrations/20251230000001_create_statement_imports_table.sql` - Added function creation
- `scripts/create-statement-imports-table.js` - Verification script
- `docs/STATEMENT_IMPORTS_TABLE_FIX.md` - This documentation





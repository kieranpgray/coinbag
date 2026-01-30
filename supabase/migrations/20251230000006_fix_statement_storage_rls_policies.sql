-- Migration: Fix statement storage RLS policies
-- Description: Replaces incorrect storage.foldername() function with split_part() for path parsing
-- Issue: storage.foldername() is not a valid Supabase function, causing RLS policy violations
-- Fix: Use split_part(name, '/', 1) to extract userId from path structure: {userId}/{accountId}/{filename}
-- Rollback: Re-run previous migration to restore old policies

-- Drop existing policies (if they exist) to recreate with correct syntax
DROP POLICY IF EXISTS "Users can upload their own statement files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own statement files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own statement files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own statement files" ON storage.objects;

-- Policy: Users can upload files to their own folder
-- Path structure: {userId}/{accountId}/{timestamp}-{filename}
-- Extract userId using split_part(name, '/', 1) - first segment of path
CREATE POLICY "Users can upload their own statement files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
  );

-- Policy: Users can view their own statement files
CREATE POLICY "Users can view their own statement files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
  );

-- Policy: Users can update their own statement files
CREATE POLICY "Users can update their own statement files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
  );

-- Policy: Users can delete their own statement files
CREATE POLICY "Users can delete their own statement files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = split_part(name, '/', 1)
  );

-- Note: The path structure is: {userId}/{accountId}/{timestamp}-{filename}
-- split_part(name, '/', 1) extracts the userId (first folder)
-- This ensures users can only access files in their own folder





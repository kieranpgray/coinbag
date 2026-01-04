-- Migration: Create storage bucket for statement files
-- Description: Creates a Supabase storage bucket for statement PDFs and images with RLS policies
-- Rollback: DROP POLICY statements and DELETE FROM storage.buckets WHERE id = 'statements';

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'statements',
  'statements',
  false, -- Private bucket
  10485760, -- 10MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is enabled by default on storage.objects
-- We cannot ALTER storage.objects directly, but policies will work

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload their own statement files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own statement files
CREATE POLICY "Users can view their own statement files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own statement files
CREATE POLICY "Users can update their own statement files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own statement files
CREATE POLICY "Users can delete their own statement files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'statements' AND
    (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
  );

-- Note: Comments on storage.objects policies require superuser privileges
-- Policies are self-documenting through their names


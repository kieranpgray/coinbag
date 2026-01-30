-- Migration: Create ocr_results table for caching OCR extraction results
-- Description: Creates a table to cache OCR markdown and structured data to avoid re-processing duplicate statements
-- Prerequisites: Requires pgcrypto extension for gen_random_uuid()
-- Rollback: DROP TABLE ocr_results;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ocr_results table
CREATE TABLE IF NOT EXISTS ocr_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash text NOT NULL,
  ocr_content_hash text NOT NULL,
  markdown_text text NOT NULL,
  structured_data jsonb,
  pages_count integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(file_hash, ocr_content_hash)
);

-- Add table comment
COMMENT ON TABLE ocr_results IS 'Cached OCR extraction results to avoid re-processing duplicate statements';

-- Add column comments
COMMENT ON COLUMN ocr_results.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN ocr_results.file_hash IS 'SHA-256 hash of the original file for deduplication';
COMMENT ON COLUMN ocr_results.ocr_content_hash IS 'SHA-256 hash of the OCR markdown content for validation';
COMMENT ON COLUMN ocr_results.markdown_text IS 'Full markdown text extracted from OCR';
COMMENT ON COLUMN ocr_results.structured_data IS 'Structured JSON data extracted from markdown (transactions, account info, etc.)';
COMMENT ON COLUMN ocr_results.pages_count IS 'Number of pages processed';
COMMENT ON COLUMN ocr_results.created_at IS 'Record creation timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ocr_results_file_hash ON ocr_results(file_hash);
CREATE INDEX IF NOT EXISTS idx_ocr_results_content_hash ON ocr_results(ocr_content_hash);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_results(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role to manage OCR results (for Edge Functions)
-- Note: OCR results are shared across users for the same file, so we use service role access
-- The file_hash ensures users can only access results for files they've uploaded
CREATE POLICY "Service role can manage OCR results" ON ocr_results
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Users can read OCR results for files they've uploaded
-- This is checked via file_hash matching their statement_imports
CREATE POLICY "Users can read OCR results for their files" ON ocr_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM statement_imports
      WHERE statement_imports.file_hash = ocr_results.file_hash
      AND statement_imports.user_id = (auth.jwt() ->> 'sub')
    )
  );


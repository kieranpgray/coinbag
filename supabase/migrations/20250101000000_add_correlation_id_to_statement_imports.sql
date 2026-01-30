-- Migration: Add correlation_id column to statement_imports table
-- Description: Adds correlation_id field for end-to-end tracing of statement imports
-- Prerequisites: statement_imports table must exist

-- Add correlation_id column
ALTER TABLE statement_imports
ADD COLUMN IF NOT EXISTS correlation_id text;

-- Add index for correlation_id lookups
CREATE INDEX IF NOT EXISTS idx_statement_imports_correlation_id 
ON statement_imports(correlation_id);

-- Add comment
COMMENT ON COLUMN statement_imports.correlation_id IS 'Correlation ID for tracing import flow across frontend, edge function, and database';


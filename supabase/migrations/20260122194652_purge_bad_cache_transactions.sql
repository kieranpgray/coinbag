-- Purge fabricated transactions from bad cached import
-- This migration deletes transactions from the bad cached import and marks it as invalid

-- Bad cache import ID
DO $$
DECLARE
  bad_cache_import_id UUID := '90beccdb-d1ea-4dd8-af03-56c4156ad672';
  deleted_count INTEGER;
BEGIN
  -- Delete all transactions from the bad cached import
  DELETE FROM transactions 
  WHERE statement_import_id = bad_cache_import_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % transactions from bad cache import', deleted_count;

  -- Mark the bad cached import as failed
  UPDATE statement_imports
  SET 
    status = 'failed',
    error_message = 'Cache invalidated - contained fabricated transactions',
    updated_at = NOW()
  WHERE id = bad_cache_import_id;

  RAISE NOTICE 'Marked bad cached import as failed';
END $$;

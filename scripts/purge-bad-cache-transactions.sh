#!/bin/bash
# Purge fabricated transactions from bad cached import
# This script deletes transactions from the bad cached import and marks it as invalid

set -e

BAD_CACHE_IMPORT_ID="90beccdb-d1ea-4dd8-af03-56c4156ad672"

echo "Purging bad cache transactions from import: $BAD_CACHE_IMPORT_ID"

# Check if supabase is linked
if ! supabase status >/dev/null 2>&1; then
  echo "Error: Supabase project not linked. Run 'supabase link' first."
  exit 1
fi

# Get project ref
PROJECT_REF=$(supabase status --output json 2>/dev/null | grep -o '"project_ref":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$PROJECT_REF" ]; then
  echo "Error: Could not determine project ref. Make sure Supabase is linked."
  exit 1
fi

echo "Project ref: $PROJECT_REF"

# SQL to delete transactions and mark import as invalid
SQL=$(cat <<EOF
-- Delete all transactions from the bad cached import
DELETE FROM transactions 
WHERE statement_import_id = '$BAD_CACHE_IMPORT_ID';

-- Mark the bad cached import as failed
UPDATE statement_imports
SET 
  status = 'failed',
  error_message = 'Cache invalidated - contained fabricated transactions',
  updated_at = NOW()
WHERE id = '$BAD_CACHE_IMPORT_ID';

-- Find and mark all imports that copied from this bad cache
UPDATE statement_imports
SET 
  error_message = COALESCE(error_message || '; ', '') || 'Copied from invalidated cache',
  updated_at = NOW()
WHERE 
  parsing_method = 'ocr'
  AND metadata->>'extraction_method' IS NOT NULL
  AND id != '$BAD_CACHE_IMPORT_ID'
  AND EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.statement_import_id = statement_imports.id 
    AND t.description IN (
      SELECT description FROM transactions 
      WHERE statement_import_id = '$BAD_CACHE_IMPORT_ID'
      LIMIT 5
    )
  );

-- Return count of affected imports
SELECT 
  (SELECT COUNT(*) FROM transactions WHERE statement_import_id = '$BAD_CACHE_IMPORT_ID') as remaining_transactions,
  (SELECT COUNT(*) FROM statement_imports WHERE id = '$BAD_CACHE_IMPORT_ID' AND status = 'failed') as import_marked_failed;
EOF
)

# Create a temporary migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEMP_MIGRATION="supabase/migrations/${TIMESTAMP}_purge_bad_cache.sql"
echo "$SQL" > "$TEMP_MIGRATION"

echo "Created temporary migration file: $TEMP_MIGRATION"
echo "Executing SQL to purge bad cache..."

# Execute the migration
if supabase db push; then
  echo "✅ Migration applied successfully"
  # Remove the temporary migration file
  rm "$TEMP_MIGRATION"
  echo "✅ Cleaned up temporary migration file"
else
  echo "Error: Failed to execute SQL via migration."
  echo ""
  echo "The migration file has been saved to: $TEMP_MIGRATION"
  echo "You can:"
  echo "1. Run it manually: supabase db push"
  echo "2. Or execute the SQL in Supabase Dashboard → SQL Editor"
  echo ""
  echo "SQL to execute:"
  echo "$SQL"
  exit 1
fi

echo "✅ Bad cache transactions purged successfully"
echo ""
echo "Next steps:"
echo "1. Upload a new statement - it will extract via OCR (cache is disabled)"
echo "2. Verify transactions match actual statement content"
echo "3. Check edge function logs show OCR extraction, not cache reuse"


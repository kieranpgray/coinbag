#!/bin/bash
# Script to create the statements storage bucket directly
# Uses PostgreSQL connection to execute the migration SQL

set -e

PROJECT_REF="tislabgxitwtcqfwrpik"
DB_PASSWORD="tfq1azv-zdr@UJE1uxp"

echo "🔧 Creating Statements Storage Bucket"
echo "=====================================\n"

# Read the migration SQL
MIGRATION_FILE="supabase/migrations/20251230000005_create_statement_storage_bucket.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📋 Reading migration file..."
echo ""

# Execute SQL using psql via connection string
CONNECTION_STRING="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

echo "🚀 Executing migration..."
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found. Installing PostgreSQL client..."
  echo "   On macOS: brew install postgresql"
  echo "   On Ubuntu: sudo apt-get install postgresql-client"
  echo ""
  echo "📋 SQL to execute manually:"
  echo "   Go to Supabase Dashboard → SQL Editor"
  echo "   Copy and paste the contents of: $MIGRATION_FILE"
  exit 1
fi

# Execute the migration
psql "$CONNECTION_STRING" -f "$MIGRATION_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration executed successfully!"
  echo ""
  echo "📋 Verification steps:"
  echo "   1. Check Supabase Dashboard → Storage → Buckets"
  echo "   2. Verify 'statements' bucket exists"
  echo "   3. Check Storage → Policies for RLS policies"
else
  echo ""
  echo "❌ Migration failed. Check the error above."
  echo ""
  echo "💡 Alternative: Run manually in Supabase Dashboard → SQL Editor"
  exit 1
fi


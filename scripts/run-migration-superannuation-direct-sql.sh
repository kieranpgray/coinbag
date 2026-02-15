#!/bin/bash
# Alternative: Run Superannuation migration directly via SQL
# Use this if CLI linking fails due to circuit breaker

set -e

PROJECT_REF="tislabgxitwtcqfwrpik"
DB_PASSWORD="tfq1azv-zdr@UJE1uxp"
MIGRATION_FILE="supabase/migrations/20251229160001_add_superannuation_asset_type.sql"

echo "🔧 Running Superannuation Migration via Direct SQL"
echo "=================================================="
echo ""
echo "Project: supafolio-dev ($PROJECT_REF)"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Please install PostgreSQL client tools"
  echo ""
  echo "On macOS:"
  echo "  brew install postgresql"
  echo ""
  echo "Or use Supabase Dashboard SQL Editor instead"
  exit 1
fi

# Construct connection string
DB_HOST="aws-1-ap-south-1.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.tislabgxitwtcqfwrpik"
DB_NAME="postgres"
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "📋 Running migration SQL..."
echo ""

# Run the migration SQL
psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration complete!"
  echo ""
  echo "📋 Verification:"
  echo "  1. Refresh your app"
  echo "  2. Try updating an asset to 'Superannuation' - it should work now!"
else
  echo ""
  echo "❌ Migration failed"
  echo ""
  echo "Alternative: Run the SQL manually in Supabase Dashboard:"
  echo "  1. Go to: https://app.supabase.com/project/$PROJECT_REF/sql"
  echo "  2. Copy contents of: $MIGRATION_FILE"
  echo "  3. Paste and run"
fi






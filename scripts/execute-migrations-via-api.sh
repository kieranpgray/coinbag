#!/bin/bash
# Execute migrations using Supabase Management API or direct PostgreSQL connection
# This script uses psql if available, or provides instructions for manual execution

set -e

PROJECT_REF="auvtsvmtfrbpvgyvfqlx"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🔧 Supabase Migration Executor"
echo "==============================="
echo "Project: $PROJECT_REF"
echo "URL: $SUPABASE_URL"
echo ""

# Check if we have service role key
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  echo ""
  echo "To get your service role key:"
  echo "  1. Go to Supabase Dashboard → Project Settings → API"
  echo "  2. Copy the 'service_role' key (NOT the anon key)"
  echo "  3. Run: export SUPABASE_SERVICE_ROLE_KEY='your-key-here'"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# Check if psql is available
if command -v psql &> /dev/null; then
  echo "✅ psql found - can execute migrations directly"
  echo ""
  
  # Extract database connection info
  # We need the database password from Supabase Dashboard
  if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "⚠️  SUPABASE_DB_PASSWORD not set"
    echo ""
    echo "To get your database password:"
    echo "  1. Go to Supabase Dashboard → Project Settings → Database"
    echo "  2. Copy the database password (or reset it)"
    echo "  3. Run: export SUPABASE_DB_PASSWORD='your-password-here'"
    echo ""
    echo "Then run this script again."
    echo ""
    echo "Alternatively, run migrations manually in Supabase Dashboard SQL Editor"
    exit 1
  fi
  
  # Construct connection string
  DB_HOST="db.${PROJECT_REF}.supabase.co"
  DB_PORT="5432"
  DB_NAME="postgres"
  DB_USER="postgres"
  
  echo "🔗 Connecting to database..."
  echo "   Host: $DB_HOST"
  echo "   Database: $DB_NAME"
  echo ""
  
  # Run migrations in order (skip migration 1 as it's already done)
  MIGRATIONS=(
    "20251227120113_create_categories_table.sql"
    "20251227120114_fix_subscriptions_user_id_type.sql"
    "20251227130000_create_user_preferences_table.sql"
    "20251228110046_create_assets_table.sql"
    "20251228120000_add_cash_asset_type.sql"
    "20251228130000_create_liabilities_table.sql"
    "20251228140000_create_accounts_table.sql"
    "20251228150000_create_income_table.sql"
    "20251228160000_create_goals_table.sql"
    "20251228170000_test_jwt_extraction_function.sql"
    "20251228180000_data_recovery_fix_user_ids.sql"
  )
  
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  
  for i in "${!MIGRATIONS[@]}"; do
    MIGRATION="${MIGRATIONS[$i]}"
    NUM=$((i + 2))  # Start from 2 since migration 1 is done
    
    echo "[$NUM/12] Running: $MIGRATION"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -f "supabase/migrations/$MIGRATION" > /tmp/migration_${NUM}.log 2>&1; then
      echo "  ✅ Success"
    else
      echo "  ❌ Failed - check /tmp/migration_${NUM}.log for details"
      echo "  Error output:"
      tail -20 /tmp/migration_${NUM}.log
      exit 1
    fi
  done
  
  echo ""
  echo "✅ All migrations completed successfully!"
  
else
  echo "⚠️  psql not found"
  echo ""
  echo "To install psql:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  echo ""
  echo "Or run migrations manually:"
  echo "  1. Go to Supabase Dashboard → SQL Editor"
  echo "  2. Run each migration file from supabase/migrations/ in order (2-12)"
  echo ""
fi


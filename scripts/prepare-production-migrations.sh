#!/bin/bash
# Script to prepare and verify migrations for production Supabase
# This script helps you prepare migrations but does NOT run them automatically
# You must run migrations manually in Supabase Dashboard SQL Editor

set -e

MIGRATIONS_DIR="supabase/migrations"
OUTPUT_FILE="PRODUCTION_MIGRATIONS.md"

echo "🔍 Preparing Production Migrations..."
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Error: Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# List all migration files in order
echo "📋 Migration Files Found:"
echo ""

MIGRATIONS=(
  "20251227120112_create_subscriptions_table.sql"
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

MISSING_FILES=()
EXISTING_FILES=()

for i in "${!MIGRATIONS[@]}"; do
  FILE="${MIGRATIONS[$i]}"
  NUM=$((i + 1))
  
  if [ -f "$MIGRATIONS_DIR/$FILE" ]; then
    echo "  ✅ $NUM. $FILE"
    EXISTING_FILES+=("$FILE")
  else
    echo "  ❌ $NUM. $FILE (MISSING)"
    MISSING_FILES+=("$FILE")
  fi
done

echo ""

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "⚠️  Warning: ${#MISSING_FILES[@]} migration file(s) missing!"
  echo ""
  exit 1
fi

echo "✅ All 12 migration files found!"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Go to your production Supabase Dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Run each migration file in order (1-12)"
echo "4. Verify each migration succeeds before proceeding"
echo ""
echo "📖 See docs/SUPABASE_DEV_TO_PROD_MIGRATION.md for detailed instructions"
echo ""


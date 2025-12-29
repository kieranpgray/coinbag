#!/bin/bash
# Prepare migrations for easy copy-paste into Supabase Dashboard SQL Editor

set -e

echo "📋 Preparing Migrations for Supabase Dashboard"
echo "=============================================="
echo ""
echo "This script will output each migration SQL in order."
echo "Copy each one into Supabase Dashboard → SQL Editor"
echo ""

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

OUTPUT_DIR="migration-outputs"
mkdir -p "$OUTPUT_DIR"

for i in "${!MIGRATIONS[@]}"; do
  MIGRATION="${MIGRATIONS[$i]}"
  NUM=$((i + 2))  # Start from 2 since migration 1 is done
  
  echo "[$NUM/11] Preparing: $MIGRATION"
  
  if [ -f "supabase/migrations/$MIGRATION" ]; then
    OUTPUT_FILE="$OUTPUT_DIR/migration_${NUM}_${MIGRATION}"
    cp "supabase/migrations/$MIGRATION" "$OUTPUT_FILE"
    echo "  ✅ Saved to: $OUTPUT_FILE"
  else
    echo "  ❌ File not found: supabase/migrations/$MIGRATION"
  fi
done

echo ""
echo "✅ All migrations prepared!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to Supabase Dashboard → SQL Editor"
echo "   2. Open each file from $OUTPUT_DIR/ in order (migration_2_* through migration_12_*)"
echo "   3. Copy the SQL content"
echo "   4. Paste into SQL Editor and click Run"
echo "   5. Verify success before proceeding to next migration"
echo ""
echo "💡 Tip: Migration 2 has been fixed and is idempotent (safe to re-run)"


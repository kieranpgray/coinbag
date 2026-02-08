#!/bin/bash
# Apply theme_preference migration directly via SQL
# This avoids migration ordering conflicts

set -e

echo "🔧 Applying Theme Preference Migration"
echo "======================================"
echo ""

PROJECT_REF="auvtsvmtfrbpvgyvfqlx"
DB_PASSWORD="vzp4pkg-pvp.AMC6yhc"
MIGRATION_FILE="supabase/migrations/20260203135440_convert_dark_mode_to_theme_preference.sql"

echo "📋 Reading migration file..."
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "🚀 Applying migration to production database..."
echo ""

# Use Supabase CLI to execute SQL directly
PGPASSWORD="$DB_PASSWORD" psql \
  "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres" \
  -f "$MIGRATION_FILE" \
  2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Verify the theme_preference column exists"
  echo "   2. Test the application with new theme preference"
  echo "   3. Verify existing users were migrated correctly"
else
  echo ""
  echo "❌ Migration failed. Check the error above."
  exit 1
fi


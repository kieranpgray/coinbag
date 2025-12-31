#!/bin/bash
# Quick script to run the Superannuation asset type migration
# This fixes the constraint violation when changing assets to Superannuation

set -e

echo "🔧 Running Superannuation Asset Type Migration"
echo "==============================================\n"

MIGRATION_FILE="supabase/migrations/20251229160001_add_superannuation_asset_type.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📋 Migration file: $MIGRATION_FILE"
echo ""
echo "This migration will:"
echo "  1. Drop the existing assets_type_check constraint"
echo "  2. Add a new constraint that includes 'Superannuation'"
echo ""
echo "⚠️  This will modify your database!"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI found"
  echo ""
  echo "Option 1: Run via Supabase CLI (recommended)"
  echo "  supabase db push"
  echo ""
  echo "Option 2: Run manually in Supabase Dashboard"
  echo "  1. Go to: https://app.supabase.com → Your Project → SQL Editor"
  echo "  2. Copy the contents of: $MIGRATION_FILE"
  echo "  3. Paste and run"
  echo ""
  read -p "Run via CLI now? (y/n): " RUN_CLI
  
  if [ "$RUN_CLI" = "y" ] || [ "$RUN_CLI" = "Y" ]; then
    echo ""
    echo "🚀 Running migration via Supabase CLI..."
    supabase db push
    echo ""
    echo "✅ Migration complete!"
  else
    echo ""
    echo "📋 To run manually:"
    echo "  1. Open: $MIGRATION_FILE"
    echo "  2. Copy the SQL"
    echo "  3. Run it in Supabase Dashboard → SQL Editor"
  fi
else
  echo "⚠️  Supabase CLI not found"
  echo ""
  echo "📋 To run this migration:"
  echo ""
  echo "Option 1: Install Supabase CLI"
  echo "  npm install -g supabase"
  echo "  Then run: supabase db push"
  echo ""
  echo "Option 2: Run manually in Supabase Dashboard"
  echo "  1. Go to: https://app.supabase.com → Your Project → SQL Editor"
  echo "  2. Copy the contents of: $MIGRATION_FILE"
  echo "  3. Paste and run"
  echo ""
  echo "Migration SQL:"
  echo "----------------------------------------"
  cat "$MIGRATION_FILE"
  echo "----------------------------------------"
fi

echo ""
echo "✅ After running the migration, refresh your app and try updating the asset again."


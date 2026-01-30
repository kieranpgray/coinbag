#!/bin/bash
# Script to run the subscriptions-to-expenses migration
# This migration renames the subscriptions table to expenses

set -e

echo "🔧 Running Subscriptions to Expenses Migration"
echo "===============================================\n"

MIGRATION_FILE="supabase/migrations/20260103085822_rename_subscriptions_to_expenses.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📋 Migration file: $MIGRATION_FILE"
echo ""
echo "This migration will:"
echo "  1. Rename 'subscriptions' table to 'expenses'"
echo "  2. Update all indexes, triggers, and RLS policies"
echo "  3. Create a backward compatibility view"
echo ""
echo "⚠️  This will modify your database!"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI found"
  echo ""
  
  # Check if project is linked
  if [ ! -f ".supabase/config.toml" ]; then
    echo "📋 Project not linked. You need to link to your Supabase project first."
    echo ""
    echo "Get your project reference ID from:"
    echo "  Supabase Dashboard → Project Settings → General → Reference ID"
    echo ""
    read -p "Enter your Supabase project reference ID: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
      echo "❌ Project reference ID is required"
      exit 1
    fi
    
    echo ""
    echo "🔗 Linking to project: $PROJECT_REF"
    supabase link --project-ref "$PROJECT_REF"
    echo ""
  fi
  
  echo "Option 1: Run via Supabase CLI (recommended)"
  echo "  This will apply all pending migrations including this one"
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
    echo "   (This will apply all pending migrations)"
    echo ""
    supabase db push
    echo ""
    echo "✅ Migration complete!"
    echo ""
    echo "📋 Verification:"
    echo "  1. Check Supabase Dashboard → Table Editor"
    echo "  2. Verify 'expenses' table exists"
    echo "  3. Verify 'subscriptions' view exists (backward compatibility)"
  else
    echo ""
    echo "📋 To run manually:"
    echo "  1. Open: $MIGRATION_FILE"
    echo "  2. Copy the SQL"
    echo "  3. Run it in Supabase Dashboard → SQL Editor"
    echo ""
    echo "⚠️  IMPORTANT: Make sure to run this migration before using the app!"
  fi
else
  echo "⚠️  Supabase CLI not found"
  echo ""
  echo "To install Supabase CLI:"
  echo "  npm install -g supabase"
  echo "  # or"
  echo "  brew install supabase/tap/supabase"
  echo ""
  echo "Or run the migration manually:"
  echo "  1. Open: $MIGRATION_FILE"
  echo "  2. Copy the SQL"
  echo "  3. Run it in Supabase Dashboard → SQL Editor"
fi






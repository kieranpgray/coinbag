#!/bin/bash
# Helper script to run the institution optional migration
# This script applies the migration that makes the institution field optional

set -e

PROJECT_REF="auvtsvmtfrbpvgyvfqlx"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🔧 Institution Optional Migration Helper"
echo "========================================="
echo "Project: $PROJECT_REF"
echo "Migration: 20260106000000_ensure_institution_is_optional.sql"
echo ""

echo "This migration makes the institution field optional in accounts, assets, and liabilities tables."
echo ""

# Method 1: Try using Supabase CLI (requires access token)
if command -v supabase &> /dev/null; then
  if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "✅ Access token provided - using Supabase CLI"
    echo ""
    export SUPABASE_ACCESS_TOKEN
    supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
    supabase db push
    echo ""
    echo "✅ Migration completed successfully!"
    echo "You can now test the fix by creating an account without an institution."
    exit $?
  fi
fi

# Method 2: Provide instructions
echo "⚠️  No automated execution method available"
echo ""
echo "To run the migration manually:"
echo ""
echo "Option 1: Using Supabase Dashboard"
echo "1. Go to Supabase Dashboard → SQL Editor"
echo "2. Run the contents of: supabase/migrations/20260106000000_ensure_institution_is_optional.sql"
echo ""
echo "Option 2: Using Supabase CLI"
echo "1. Get your access token from: https://supabase.com/dashboard/account/tokens"
echo "2. Run:"
echo "   export SUPABASE_ACCESS_TOKEN='your-token-here'"
echo "   supabase link --project-ref $PROJECT_REF"
echo "   supabase db push"
echo ""
echo "After running the migration, test by:"
echo "- Going to Accounts page"
echo "- Adding a new Bank Account"
echo "- Leaving the Institution field blank"
echo "- Verifying successful account creation"

exit 1

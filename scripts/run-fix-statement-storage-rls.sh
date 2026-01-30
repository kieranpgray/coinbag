#!/bin/bash
# Script to fix statement storage RLS policies using Supabase CLI
# This fixes the incorrect storage.foldername() function usage

set -e

PROJECT_REF="tislabgxitwtcqfwrpik"

echo "🔧 Fix Statement Storage RLS Policies"
echo "=====================================\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found."
  echo "   Install with: npm install -g supabase"
  exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "📋 Linking to Supabase project..."
  echo ""
  supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo "⚠️  WARNING: This will modify your database RLS policies!"
echo "   This migration fixes the storage RLS policies to use correct path parsing."
echo "   It will drop and recreate the policies with the correct syntax."
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🚀 Running RLS policy fix migration..."
echo ""

# Push migrations (this applies all pending migrations including the fix)
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Verification steps:"
echo "   1. Check Supabase Dashboard → Storage → Policies"
echo "   2. Verify policies use split_part() instead of storage.foldername()"
echo "   3. Test file upload in the application"
echo ""
echo "💡 To verify policies manually, run:"
echo "   SELECT policyname, cmd, qual, with_check FROM pg_policies"
echo "   WHERE schemaname = 'storage' AND tablename = 'objects'"
echo "   AND policyname LIKE '%statement%';"





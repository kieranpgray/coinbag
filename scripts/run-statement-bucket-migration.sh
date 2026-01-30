#!/bin/bash
# Script to run the statement storage bucket migration using Supabase CLI
# This creates the 'statements' storage bucket with RLS policies

set -e

echo "🔧 Statement Storage Bucket Migration"
echo "=====================================\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Installing..."
  npm install -g supabase
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "📋 Linking to Supabase project..."
  echo ""
  echo "You need to provide:"
  echo "  1. Your Supabase project reference ID"
  echo "     Find this in: Supabase Dashboard → Project Settings → General → Reference ID"
  echo ""
  read -p "Enter your Supabase project reference ID: " PROJECT_REF
  
  if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference ID is required"
    exit 1
  fi
  
  echo "🔗 Linking to project: $PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF"
fi

echo ""
echo "⚠️  WARNING: This will modify your database!"
echo "   This migration creates the 'statements' storage bucket and RLS policies."
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🚀 Running statement storage bucket migration..."
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20251230000005_create_statement_storage_bucket.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Push migrations (this applies all pending migrations including the bucket one)
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Verification steps:"
echo "   1. Check Supabase Dashboard → Storage → Buckets"
echo "   2. Verify 'statements' bucket exists"
echo "   3. Check Storage → Policies to verify RLS policies are created"
echo "   4. Test file upload in the application"


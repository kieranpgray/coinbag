#!/bin/bash
# Script to run Supabase migrations using Supabase CLI
# This is safer than manual execution and provides better error handling

set -e

echo "🔧 Supabase Production Migration Runner (CLI)"
echo "=============================================\n"

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
echo "⚠️  WARNING: This will modify your PRODUCTION database!"
echo "   Migrations will be applied in order."
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🚀 Running migrations..."
echo ""

# Push migrations (this applies all pending migrations)
supabase db push

echo ""
echo "✅ Migrations complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify tables in Supabase Dashboard → Table Editor"
echo "   2. Configure Clerk JWT validation"
echo "   3. Test JWT extraction function"


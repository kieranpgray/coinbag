#!/bin/bash
# Apply Superannuation migration directly using Supabase CLI with password
# This script can be run once you have the database password

set -e

PROJECT_REF="tislabgxitwtcqfwrpik"

echo "🔧 Applying Superannuation Asset Type Migration"
echo "================================================"
echo ""

# Check if password is provided
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "⚠️  Database password required"
  echo ""
  echo "Get your password from:"
  echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
  echo ""
  echo "Then run:"
  echo "  export SUPABASE_DB_PASSWORD='your-password'"
  echo "  ./scripts/apply-superannuation-migration-direct.sh"
  echo ""
  exit 1
fi

echo "📋 Linking to project: $PROJECT_REF"
echo "$SUPABASE_DB_PASSWORD" | supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" 2>&1 || {
  # Try alternative method
  echo "Linking with password prompt..."
  echo "$SUPABASE_DB_PASSWORD" | supabase link --project-ref "$PROJECT_REF" 2>&1 || {
    echo ""
    echo "❌ Failed to link. Please run manually:"
    echo "  supabase link --project-ref $PROJECT_REF"
    echo "  (Enter password when prompted)"
    exit 1
  }
}

echo ""
echo "🚀 Pushing migrations..."
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Refresh your app"
echo "  2. Try updating an asset to 'Superannuation' - it should work now!"



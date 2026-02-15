#!/bin/bash
# Run Superannuation asset type migration using Supabase CLI
# This is the preferred method for running migrations

set -e

# supafolio-dev project
PROJECT_REF="tislabgxitwtcqfwrpik"
DB_PASSWORD="tfq1azv-zdr@UJE1uxp"
MIGRATION_FILE="supabase/migrations/20251229160001_add_superannuation_asset_type.sql"

echo "🔧 Running Superannuation Asset Type Migration via Supabase CLI"
echo "==============================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Installing..."
  npm install -g supabase
fi

# Check if access token is available
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "✅ Using access token for authentication"
  export SUPABASE_ACCESS_TOKEN
  supabase login --token "$SUPABASE_ACCESS_TOKEN" 2>/dev/null || true
fi

# Check if logged in (try to list projects)
if ! supabase projects list &>/dev/null 2>&1; then
  echo "⚠️  Not authenticated with Supabase CLI"
  echo ""
  echo "Please authenticate first using one of these methods:"
  echo ""
  echo "Method 1: Browser login (interactive)"
  echo "  supabase login"
  echo ""
  echo "Method 2: Access token (non-interactive)"
  echo "  Get token from: https://supabase.com/dashboard/account/tokens"
  echo "  export SUPABASE_ACCESS_TOKEN='your-token'"
  echo "  supabase login --token \$SUPABASE_ACCESS_TOKEN"
  echo ""
  echo "Method 3: Database password (for linking)"
  echo "  supabase link --project-ref $PROJECT_REF"
  echo "  (You'll be prompted for database password)"
  echo ""
  exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "📋 Linking to Supabase project: $PROJECT_REF (supafolio-dev)"
  echo "   Using stored database password..."
  supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD" || {
    echo ""
    echo "⚠️  Link failed. This might be due to:"
    echo "   1. Circuit breaker (too many failed attempts) - wait 5-10 minutes"
    echo "   2. Incorrect password"
    echo ""
    echo "You can also run manually:"
    echo "   supabase link --project-ref $PROJECT_REF --password '$DB_PASSWORD'"
    exit 1
  }
fi

echo ""
echo "🚀 Pushing migrations to database..."
echo ""

# Push all pending migrations (including the Superannuation one)
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Verification:"
echo "  1. Try updating an asset to 'Superannuation' - it should work now!"
echo "  2. Check Supabase Dashboard → Table Editor → assets → Constraints"
echo "     The assets_type_check constraint should include 'Superannuation'"

#!/bin/bash
# Fix environment configuration for production

set -e

ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing Production Configuration..."
echo ""

# Backup .env
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP_FILE"
  echo "✅ Created backup: $BACKUP_FILE"
else
  echo "❌ .env file not found"
  exit 1
fi

# Fix 1: Update Supabase URL from moneybags to coinbag
if grep -q "tislabgxitwtcqfwrpik" "$ENV_FILE"; then
  echo "⚠️  Fixing Supabase URL: moneybags → coinbag"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's|https://tislabgxitwtcqfwrpik\.supabase\.co|https://auvtsvmtfrbpvgyvfqlx.supabase.co|g' "$ENV_FILE"
  else
    # Linux
    sed -i 's|https://tislabgxitwtcqfwrpik\.supabase\.co|https://auvtsvmtfrbpvgyvfqlx.supabase.co|g' "$ENV_FILE"
  fi
  echo "✅ Updated VITE_SUPABASE_URL to coinbag project"
else
  echo "✅ Supabase URL already correct"
fi

# Fix 2: Check Clerk key
if grep -q "VITE_CLERK_PUBLISHABLE_KEY=pk_test_" "$ENV_FILE"; then
  echo ""
  echo "⚠️  WARNING: Using TEST Clerk key (pk_test_)"
  echo "   ⚠️  MANUAL ACTION REQUIRED:"
  echo "   1. Go to https://dashboard.clerk.com → API Keys → Production"
  echo "   2. Copy the production publishable key (pk_live_...)"
  echo "   3. Update VITE_CLERK_PUBLISHABLE_KEY in .env"
else
  echo "✅ Clerk key check passed"
fi

# Fix 3: Note about Supabase anon key
echo ""
echo "⚠️  NOTE: You may need to update VITE_SUPABASE_ANON_KEY"
echo "   Get it from: https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/settings/api"

echo ""
echo "✅ Configuration fixes applied"
echo ""
echo "📋 Next Steps:"
echo "   1. Update VITE_CLERK_PUBLISHABLE_KEY to production key (pk_live_...)"
echo "   2. Verify VITE_SUPABASE_ANON_KEY is for coinbag project"
echo "   3. Set all variables in Vercel Dashboard (see docs/VERCEL_ENV_SETUP.md)"

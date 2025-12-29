#!/bin/bash
# Fix production configuration issues

set -e

echo "🔧 Fixing Production Configuration Issues..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Created backup: .env.backup.*"

# Fix Supabase URL (change from moneybags to coinbag)
if grep -q "tislabgxitwtcqfwrpik" .env; then
  echo "⚠️  Found moneybags project URL, updating to coinbag..."
  sed -i '' 's|https://tislabgxitwtcqfwrpik\.supabase\.co|https://auvtsvmtfrbpvgyvfqlx.supabase.co|g' .env
  echo "✅ Updated VITE_SUPABASE_URL to coinbag project"
else
  echo "✅ Supabase URL already correct or not found"
fi

# Check Clerk key
if grep -q "VITE_CLERK_PUBLISHABLE_KEY=pk_test_" .env; then
  echo "⚠️  Found test Clerk key"
  echo "   ⚠️  MANUAL ACTION REQUIRED: Update VITE_CLERK_PUBLISHABLE_KEY to production key (pk_live_...)"
  echo "   Get it from: https://dashboard.clerk.com → API Keys → Production"
else
  echo "✅ Clerk key check passed"
fi

echo ""
echo "✅ Configuration fixes applied (where possible)"
echo ""
echo "⚠️  MANUAL ACTIONS STILL REQUIRED:"
echo "   1. Update VITE_CLERK_PUBLISHABLE_KEY to production key (pk_live_...)"
echo "   2. Get coinbag Supabase anon key and update VITE_SUPABASE_ANON_KEY"
echo "   3. Set all environment variables in Vercel Dashboard"

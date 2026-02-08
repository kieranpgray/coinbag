#!/bin/bash
# Script to deploy the process-statement Edge Function to production

set -e

echo "🚀 Deploying Edge Function to Production"
echo "========================================="
echo ""

PROJECT_REF="auvtsvmtfrbpvgyvfqlx"
FUNCTION_NAME="process-statement"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Installing..."
  npm install -g supabase
fi

echo "🔗 Checking Supabase project link..."
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
  echo "📋 Linking to Supabase project..."
  echo "   Project: $PROJECT_REF"
  echo ""
  read -p "Enter Supabase database password (or press Enter to skip): " DB_PASSWORD
  
  if [ -z "$DB_PASSWORD" ]; then
    supabase link --project-ref "$PROJECT_REF"
  else
    supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
  fi
else
  echo "✅ Project already linked"
  echo ""
fi

echo ""
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
echo "   Function: $FUNCTION_NAME"
echo "   Project: $PROJECT_REF"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🚀 Deploying Edge Function..."
echo ""

# Deploy the function
supabase functions deploy "$FUNCTION_NAME"

echo ""
echo "✅ Edge Function deployed!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to Supabase Dashboard → Edge Functions → $FUNCTION_NAME → Settings"
echo "   2. Set these environment variables (from your secure storage):"
echo "      - MISTRAL_API_KEY=<your-mistral-api-key>"
echo "      - SUPABASE_ANON_KEY=<your-supabase-anon-key>"
echo "      - SUPABASE_URL=<your-supabase-url>"
echo "   3. Verify function is active in Dashboard"
echo ""
echo "⚠️  SECURITY: Never commit API keys or secrets to git!"
echo "   Store secrets in:"
echo "   - Supabase Dashboard (for Edge Functions)"
echo "   - Vercel Dashboard (for frontend)"
echo "   - Local .env file (never commit this)"
echo ""


#!/bin/bash
# Master script to execute all Supabase migrations
# Tries multiple methods to find the best way to execute

set -e

PROJECT_REF="auvtsvmtfrbpvgyvfqlx"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🔧 Supabase Migration Executor"
echo "==============================="
echo "Project: $PROJECT_REF"
echo ""

# Method 1: Try using Node.js with pg (requires password)
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
  echo "✅ Database password provided - using PostgreSQL connection"
  echo ""
  node scripts/run-migrations-pg.js
  exit $?
fi

# Method 2: Try Supabase CLI (requires access token)
if command -v supabase &> /dev/null; then
  if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "✅ Access token provided - using Supabase CLI"
    echo ""
    export SUPABASE_ACCESS_TOKEN
    supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
    supabase db push
    exit $?
  fi
fi

# Method 3: Provide instructions
echo "⚠️  No execution method available"
echo ""
echo "To execute migrations, choose one of the following:"
echo ""
echo "Option 1: Using Database Password (Recommended)"
echo "  1. Get your database password from:"
echo "     Supabase Dashboard → Project Settings → Database"
echo "  2. Run:"
echo "     export SUPABASE_DB_PASSWORD='your-password-here'"
echo "     ./scripts/execute-all-migrations.sh"
echo ""
echo "Option 2: Using Supabase CLI"
echo "  1. Get your access token from:"
echo "     https://supabase.com/dashboard/account/tokens"
echo "  2. Run:"
echo "     export SUPABASE_ACCESS_TOKEN='your-token-here'"
echo "     ./scripts/execute-all-migrations.sh"
echo ""
echo "Option 3: Manual Execution (Safest)"
echo "  1. Go to Supabase Dashboard → SQL Editor"
echo "  2. Run each migration file from supabase/migrations/ in order:"
echo "     - Migration 2: 20251227120113_create_categories_table.sql (FIXED)"
echo "     - Migration 3: 20251227120114_fix_subscriptions_user_id_type.sql"
echo "     - Migration 4-12: (remaining migrations)"
echo ""
echo "Migration 2 has been fixed to handle existing policies."
echo "It's now idempotent and safe to re-run."

exit 1


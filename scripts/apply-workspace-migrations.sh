#!/bin/bash
# Apply workspace migrations to fix the "workplace error" in top nav bar
# This script applies only the workspace-related migrations that are missing

set -e

PROJECT_REF="${PROJECT_REF:-tislabgxitwtcqfwrpik}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🔧 Workspace Migration Executor"
echo "==============================="
echo "Project: $PROJECT_REF"
echo "URL: $SUPABASE_URL"
echo ""
echo "This will apply the workspace migrations needed to fix the top nav bar error."
echo ""

# Required workspace migrations in order
WORKSPACE_MIGRATIONS=(
  "20260226000000_create_workspaces_schema.sql"
  "20260226120000_workspace_context_domain_tables.sql"
  "20260226180000_workspace_invite_accept_function.sql"
)

# Check if we have database password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ SUPABASE_DB_PASSWORD not set"
  echo ""
  echo "To get your database password:"
  echo "  1. Go to https://app.supabase.com/project/${PROJECT_REF}/settings/database"
  echo "  2. Copy the database password (or reset it)"
  echo "  3. Run: export SUPABASE_DB_PASSWORD='your-password-here'"
  echo "  4. Run this script again: ./scripts/apply-workspace-migrations.sh"
  echo ""
  echo "Alternative: Manual execution via Supabase Dashboard"
  echo "  1. Go to SQL Editor: https://app.supabase.com/project/${PROJECT_REF}/sql/new"
  echo "  2. Copy and paste each migration file content:"
  echo "     - supabase/migrations/20260226000000_create_workspaces_schema.sql"
  echo "     - supabase/migrations/20260226120000_workspace_context_domain_tables.sql"
  echo "     - supabase/migrations/20260226180000_workspace_invite_accept_function.sql"
  echo ""
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found"
  echo ""
  echo "Install psql to run this script:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  echo ""
  echo "Or use the manual method above."
  exit 1
fi

# Database connection details (direct connection)
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🔗 Connecting to database..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo ""

export PGPASSWORD="$SUPABASE_DB_PASSWORD"

# Apply workspace migrations
for i in "${!WORKSPACE_MIGRATIONS[@]}"; do
  MIGRATION="${WORKSPACE_MIGRATIONS[$i]}"
  NUM=$((i + 1))

  echo "[$NUM/3] Running: $MIGRATION"

  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -f "supabase/migrations/$MIGRATION" > /tmp/workspace_migration_${NUM}.log 2>&1; then
    echo "  ✅ Success"
  else
    echo "  ❌ Failed - check /tmp/workspace_migration_${NUM}.log for details"
    echo "  Error output:"
    tail -20 /tmp/workspace_migration_${NUM}.log
    exit 1
  fi
done

echo ""
echo "✅ Workspace migrations completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Refresh your app to see if the workspace error is resolved"
echo "  2. The top nav bar should now show workspace information instead of an error"
echo "  3. You may need to run additional migrations for full functionality"
echo ""
echo "To verify the migrations worked, you can run this SQL in Supabase Dashboard:"
echo "SELECT 'workspaces' as table, COUNT(*) as count FROM workspaces"
echo "UNION ALL"
echo "SELECT 'workspace_memberships', COUNT(*) FROM workspace_memberships"
echo "UNION ALL"
echo "SELECT 'workspace_invitations', COUNT(*) FROM workspace_invitations;"
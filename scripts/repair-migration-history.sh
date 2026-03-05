#!/bin/bash
# Mark migrations as "applied" in the remote schema_migrations table without running their SQL.
# Use when those migrations were already applied manually (e.g. via SQL Editor or a combined script).
# Requires: SUPABASE_DB_PASSWORD set, and project linked (supabase link).
# See: docs/MIGRATION_LIST_AND_MANUAL_APPLIED.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ SUPABASE_DB_PASSWORD is not set."
  echo "   Export it or pass as first argument: SUPABASE_DB_PASSWORD='...' $0"
  exit 1
fi

# Optional: password as first arg
if [ -n "$1" ]; then
  export SUPABASE_DB_PASSWORD="$1"
fi

cd "$REPO_ROOT"

# Collect 14-digit versions from migration filenames, sort, skip the one already on remote (20250101000000)
VERSIONS=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' -exec basename {} \; | sed -n 's/^\([0-9]\{14\}\)_.*/\1/p' | sort -u)

APPLIED_COUNT=0
for version in $VERSIONS; do
  # Skip the single migration that was applied via CLI (so it's already in schema_migrations)
  if [ "$version" = "20250101000000" ]; then
    echo "⏭ Skipping $version (already recorded on remote)"
    continue
  fi
  echo "Repair: $version => applied"
  if supabase migration repair "$version" --status applied -p "$SUPABASE_DB_PASSWORD"; then
    ((APPLIED_COUNT+=1)) || true
  else
    echo "  ⚠ Failed (may already be applied or DB error)"
  fi
done

echo ""
echo "Done. Marked $APPLIED_COUNT migration(s) as applied."
echo "Run: supabase migration list -p \"\$SUPABASE_DB_PASSWORD\" to verify."

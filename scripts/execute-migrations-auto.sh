#!/bin/bash
# Autonomous migration executor using Supabase CLI

set -e

export SUPABASE_ACCESS_TOKEN='sbp_df9cd06875cfe408790fdaa539856d6d3a5beba4'
PROJECT_REF='auvtsvmtfrbpvgyvfqlx'
DB_PASSWORD='vzp4pkg-pvp.AMC6yhc'

echo "🔧 Autonomous Supabase Migration Executor"
echo "=========================================="
echo ""

# Link project (if not already linked)
echo "📋 Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF" -p "$DB_PASSWORD" 2>&1 | grep -v "Enter your database password" || true

echo ""
echo "🚀 Pushing migrations..."
echo ""

# Push migrations with password
supabase db push -p "$DB_PASSWORD" --yes

echo ""
echo "✅ Migrations complete!"


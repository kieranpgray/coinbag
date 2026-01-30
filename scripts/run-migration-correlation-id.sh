#!/bin/bash
# Script to run correlation_id migration using Supabase CLI
# This migration adds correlation_id column to statement_imports table for end-to-end tracing

set -e

echo "🔧 Correlation ID Migration Runner"
echo "===================================="
echo ""
echo "This migration adds the correlation_id column to statement_imports table"
echo "for end-to-end tracing of statement imports."
echo ""

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
echo "⚠️  WARNING: This will modify your database!"
echo "   Migration: Add correlation_id to statement_imports"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Push migrations (this applies all pending migrations including the new one)
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Verification:"
echo "   Run this SQL in Supabase Dashboard to verify:"
echo "   SELECT column_name, data_type FROM information_schema.columns"
echo "   WHERE table_name = 'statement_imports' AND column_name = 'correlation_id';"
echo ""



#!/bin/bash
# Script to run the migration that makes next_payment_date nullable
# This fixes the "null value violates not-null constraint" error

set -e

echo "Running migration: Make next_payment_date nullable"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed or not in PATH"
    echo "Please install it: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're linked to a project
if ! supabase status &> /dev/null; then
    echo "Warning: Not linked to a Supabase project"
    echo "You may need to run: supabase link --project-ref <your-project-ref>"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Pushing migrations to database..."
supabase db push

echo ""
echo "Migration completed successfully!"
echo ""
echo "Verification:"
echo "You can verify the migration worked by checking that the column is now nullable:"
echo "  SELECT column_name, is_nullable FROM information_schema.columns"
echo "  WHERE table_name = 'income' AND column_name = 'next_payment_date';"
echo ""
echo "Expected result: is_nullable should be 'YES'"





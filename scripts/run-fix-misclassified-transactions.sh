#!/bin/bash
# Script to fix misclassified credit transactions
# This script helps identify and fix transactions that were incorrectly classified as expenses

set -e

echo "=========================================="
echo "Fix Misclassified Credit Transactions"
echo "=========================================="
echo ""
echo "This script will help you fix transactions that were misclassified."
echo "It will show you what will be changed before making any updates."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. You'll need to run the SQL manually."
    echo ""
    echo "1. Open Supabase Dashboard → SQL Editor"
    echo "2. Run the queries from: scripts/fix-misclassified-credit-transactions.sql"
    echo "3. Review the SELECT results"
    echo "4. Uncomment and run the UPDATE statement if correct"
    echo ""
    exit 0
fi

# Check if project is linked
if ! supabase status &> /dev/null; then
    echo "⚠️  Supabase project not linked."
    echo "Run: supabase link --project-ref <your-project-ref>"
    echo ""
    exit 1
fi

echo "Step 1: Preview transactions that will be fixed..."
echo ""

# Run preview query
supabase db execute "
SELECT 
  COUNT(*) as transactions_to_fix,
  COUNT(DISTINCT t.account_id) as affected_accounts,
  COUNT(DISTINCT t.statement_import_id) as affected_imports
FROM transactions t
WHERE t.statement_import_id IS NOT NULL
  AND t.type = 'expense'
  AND t.amount < 0
  AND (
    t.description ILIKE '%DEPOSIT%'
    OR t.description ILIKE '%CREDIT%'
    OR t.description ILIKE '%PAYMENT THANK%'
    OR t.description ILIKE '%PAYMENT RECEIVED%'
    OR t.description ILIKE '%TRANSFER IN%'
    OR t.description ILIKE '%INTEREST%'
    OR t.description ILIKE '%REFUND%'
    OR t.description ILIKE '%REVERSAL%'
  );
" || {
    echo "❌ Failed to query database. Check your Supabase connection."
    exit 1
}

echo ""
echo "Step 2: Review detailed list..."
echo "Run this query in Supabase SQL Editor to see the full list:"
echo ""
echo "See: scripts/fix-misclassified-credit-transactions.sql"
echo ""

read -p "Do you want to proceed with the fix? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled. No changes made."
    exit 0
fi

echo ""
echo "⚠️  IMPORTANT: This script does NOT automatically run the UPDATE."
echo "Please review the SQL file and run the UPDATE manually in Supabase SQL Editor."
echo ""
echo "File: scripts/fix-misclassified-credit-transactions.sql"
echo ""
echo "The UPDATE statement is commented out for safety."
echo "Uncomment it and run it in Supabase SQL Editor after reviewing the SELECT results."
echo ""


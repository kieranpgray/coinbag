#!/bin/bash
# Run all production tests in sequence

echo "🧪 Running Complete Production Test Suite"
echo "=========================================="
echo ""

echo "📋 Test 1: Complete Setup Test"
echo "───────────────────────────────"
npx tsx scripts/test-production-setup-complete.ts

echo ""
echo "📋 Test 2: Edge Function Endpoint Test"
echo "──────────────────────────────────────"
npx tsx scripts/test-edge-function-endpoint.ts

echo ""
echo "📋 Test 3: Migration Verification"
echo "──────────────────────────────────"
npx tsx scripts/verify-migrations-applied.ts

echo ""
echo "✅ All automated tests complete!"
echo ""
echo "📋 Next: Run manual tests (see docs/PRODUCTION_TEST_REPORT.md)"

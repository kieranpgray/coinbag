#!/bin/bash
# Extract checkpoint data from various sources
# 
# This script helps collect checkpoint data from:
# 1. Database (transaction counts)
# 2. Browser console (checkpoints 6-7)
# 3. Supabase Dashboard logs (checkpoints 1-5)

set -e

echo "=== Checkpoint Data Extraction Tool ==="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Supabase environment variables not set"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Run the monitoring script
echo "Running database check..."
tsx scripts/monitor-statement-processing.ts

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Check Browser Console (Checkpoints 6-7):"
echo "   - Open DevTools (F12)"
echo "   - Go to Console tab"
echo "   - Look for '=== CHECKPOINT 6: API RESPONSE ==='"
echo "   - Look for '=== CHECKPOINT 7: UI RENDER ==='"
echo ""
echo "2. Check Supabase Dashboard (Checkpoints 1-5):"
echo "   - Go to: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs"
echo "   - Filter by time range (last hour)"
echo "   - Search for 'CHECKPOINT' keyword"
echo ""
echo "3. For continuous monitoring:"
echo "   tsx scripts/monitor-statement-processing.ts --watch"
echo ""



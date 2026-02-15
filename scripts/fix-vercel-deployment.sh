#!/bin/bash
# Script to help diagnose and fix Vercel deployment issues
# This script helps identify if both projects are linked to the same repo

set -e

echo "🔍 Vercel Deployment Diagnostic Script"
echo "========================================"
echo ""

# Check current Git remote
echo "📦 Current Git Remote:"
git remote -v
echo ""

# Check Vercel project configuration
if [ -f ".vercel/project.json" ]; then
    echo "✅ Vercel Project Configuration Found:"
    cat .vercel/project.json | jq '.' 2>/dev/null || cat .vercel/project.json
    echo ""
else
    echo "⚠️  No .vercel/project.json found"
    echo ""
fi

# Check package.json name
echo "📝 Package.json Name:"
grep '"name"' package.json || echo "No name field found"
echo ""

# Check vercel.json
if [ -f "vercel.json" ]; then
    echo "⚙️  Vercel Configuration (vercel.json):"
    echo "   - Build Command: $(jq -r '.buildCommand // "default"' vercel.json)"
    echo "   - Framework: $(jq -r '.framework // "not specified"' vercel.json)"
    echo ""
fi

echo "📋 Next Steps:"
echo "1. Check Vercel Dashboard for both 'wellthy' and 'supafolio' projects"
echo "2. Verify which GitHub repository each project is linked to"
echo "3. Configure 'Ignore Build Step' in Vercel Dashboard:"
echo "   - Wellthy: grep -q '\"name\": \"wellthy\"' package.json"
echo "   - Supafolio: grep -q '\"name\": \"supafolio\"' package.json"
echo ""
echo "4. Or use branch filters to separate deployments"
echo ""
echo "See docs/VERCEL_DEPLOYMENT_FIX.md for detailed instructions"


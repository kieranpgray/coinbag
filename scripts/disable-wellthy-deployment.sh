#!/bin/bash
# Script to disable wellthy Vercel project deployments
# This configures the wellthy project to never deploy, allowing only coinbag to deploy

set -e

echo "🔧 Disabling Wellthy Vercel Deployments"
echo "========================================"
echo ""

PROJECT_ID="prj_Qhd4BZeOwuskblQ1iaeKYtNwMUQt"
PROJECT_NAME="wellthy"

echo "📋 Project Details:"
echo "   - Project ID: $PROJECT_ID"
echo "   - Project Name: $PROJECT_NAME"
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo "⚙️  Configuring Ignore Build Step..."
echo ""
echo "The wellthy project will be configured to ALWAYS skip builds."
echo "This means only coinbag will deploy when you push to the repository."
echo ""

# Note: Vercel CLI doesn't have a direct command to set ignore build step
# We need to use the Vercel API or dashboard
echo "📝 Manual Steps Required (Vercel CLI limitation):"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select project: '$PROJECT_NAME'"
echo "3. Go to: Settings → Git"
echo "4. Scroll to: 'Ignored Build Step'"
echo "5. Enter this command:"
echo ""
echo "   exit 1"
echo ""
echo "   This will make wellthy ALWAYS skip builds."
echo ""
echo "6. Click 'Save'"
echo ""
echo "✅ After this, only coinbag will deploy on pushes."
echo ""

# Alternative: Try using Vercel API if we have a token
if [ -n "$VERCEL_TOKEN" ]; then
    echo "🔑 Vercel token found. Attempting to configure via API..."
    
    # Get current project settings
    PROJECT_SETTINGS=$(vercel project ls --json 2>/dev/null | jq ".[] | select(.id == \"$PROJECT_ID\")" 2>/dev/null || echo "")
    
    if [ -n "$PROJECT_SETTINGS" ]; then
        echo "✅ Found project in Vercel"
        echo "   Note: Ignore Build Step must be set via Dashboard"
    fi
fi

echo ""
echo "📚 See docs/DISABLE_WELLTHY_DEPLOYMENT.md for details"


#!/bin/bash
# Build check script - only allows supafolio to build
# This script exits with code 1 (skip build) if project is wellthy
# Exits with code 0 (proceed with build) for supafolio or any other project

# Vercel sets VERCEL_PROJECT_NAME environment variable
PROJECT_NAME="${VERCEL_PROJECT_NAME:-}"

# If no project name is set, allow build (fallback)
if [ -z "$PROJECT_NAME" ]; then
    echo "⚠️  No VERCEL_PROJECT_NAME set, allowing build"
    exit 0
fi

# Check if this is the wellthy project
if [ "$PROJECT_NAME" = "wellthy" ]; then
    echo "🚫 Wellthy project detected - skipping build"
    echo "   Only supafolio should deploy from this repository"
    exit 1
fi

# Allow build for supafolio or any other project
echo "✅ Allowing build for project: $PROJECT_NAME"
exit 0


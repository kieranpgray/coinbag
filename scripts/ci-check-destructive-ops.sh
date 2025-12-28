#!/bin/bash
#
# CI Check for Destructive Database Operations
#
# Scans CI/CD workflow files and scripts for destructive database operations
# that might run in production contexts.
#
# Usage:
#   ./scripts/ci-check-destructive-ops.sh
#
# Exit codes:
#   0 - No issues found
#   1 - Destructive operations detected in production context

set -e

DESTRUCTIVE_KEYWORDS=("reset" "seed" "truncate" "drop" "db reset" "db push")
PRODUCTION_CONTEXTS=("production" "prod" "main" "master" "release")
FOUND_ISSUES=0

echo "🔍 Checking for destructive database operations in CI/CD workflows..."

# Check GitHub Actions workflows
if [ -d ".github/workflows" ]; then
  for workflow_file in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$workflow_file" ]; then
      echo "  Checking: $workflow_file"
      
      # Check if workflow runs in production context
      IS_PRODUCTION=false
      for context in "${PRODUCTION_CONTEXTS[@]}"; do
        if grep -qi "$context" "$workflow_file"; then
          IS_PRODUCTION=true
          break
        fi
      done
      
      # Check for destructive operations
      if [ "$IS_PRODUCTION" = true ]; then
        for keyword in "${DESTRUCTIVE_KEYWORDS[@]}"; do
          if grep -qi "$keyword" "$workflow_file"; then
            echo "    ❌ FOUND: Destructive operation '$keyword' in production workflow"
            echo "       File: $workflow_file"
            echo "       Line: $(grep -ni "$keyword" "$workflow_file" | head -1 | cut -d: -f1)"
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
          fi
        done
      fi
    fi
  done
fi

# Check package.json scripts for production-related scripts
if [ -f "package.json" ]; then
  echo "  Checking: package.json"
  
  # Check for production-related script names
  for context in "${PRODUCTION_CONTEXTS[@]}"; do
    if grep -qi "\"$context" package.json; then
      # Check if any destructive keywords are in production scripts
      for keyword in "${DESTRUCTIVE_KEYWORDS[@]}"; do
        if grep -qi "$keyword" package.json; then
          # Check if keyword appears in same script as production context
          if grep -A 5 -B 5 -i "$context" package.json | grep -qi "$keyword"; then
            echo "    ❌ FOUND: Destructive operation '$keyword' in production script"
            echo "       File: package.json"
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
          fi
        fi
      done
    fi
  done
fi

# Summary
echo ""
if [ $FOUND_ISSUES -eq 0 ]; then
  echo "✅ No destructive operations detected in production contexts"
  exit 0
else
  echo "❌ Found $FOUND_ISSUES issue(s) with destructive operations in production"
  echo ""
  echo "   Destructive operations (reset, seed, truncate, drop) should NEVER run in production."
  echo "   Review the files above and remove or guard these operations."
  echo ""
  exit 1
fi


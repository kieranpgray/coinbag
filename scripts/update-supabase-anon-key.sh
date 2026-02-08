#!/bin/bash
# Update Supabase anon key to coinbag project

set -e

ENV_FILE=".env"
COINBAG_ANON_KEY="${SUPABASE_ANON_KEY:-}"

if [ -z "$COINBAG_ANON_KEY" ]; then
  echo "❌ Error: SUPABASE_ANON_KEY environment variable not set"
  echo "   Usage: SUPABASE_ANON_KEY=your-key ./scripts/update-supabase-anon-key.sh"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Backup
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Update anon key
if grep -q "VITE_SUPABASE_ANON_KEY=" "$ENV_FILE"; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$COINBAG_ANON_KEY|g" "$ENV_FILE"
  else
    sed -i "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$COINBAG_ANON_KEY|g" "$ENV_FILE"
  fi
  echo "✅ Updated VITE_SUPABASE_ANON_KEY to coinbag project key"
else
  echo "⚠️  VITE_SUPABASE_ANON_KEY not found, adding it..."
  echo "VITE_SUPABASE_ANON_KEY=$COINBAG_ANON_KEY" >> "$ENV_FILE"
  echo "✅ Added VITE_SUPABASE_ANON_KEY"
fi

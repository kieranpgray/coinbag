#!/bin/bash
# Update Supabase anon key to coinbag project

set -e

ENV_FILE=".env"
COINBAG_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ"

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

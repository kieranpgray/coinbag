#!/bin/bash
# Script to update production configuration with provided values
# This updates local .env file and prepares for Edge Function deployment

set -e

echo "🔧 Production Configuration Update Script"
echo "=========================================="
echo ""

# Production values
SUPABASE_URL="https://auvtsvmtfrbpvgyvfqlx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ"
CLERK_PUBLISHABLE_KEY="pk_live_Y2xlcmsuY29pbmJhZy5hcHAk"
CLERK_DOMAIN="clerk.coinbag.app"
CLERK_INSTANCE_ID="ins_37VAGQw0JVza01qpTa6yUt8iVLY"
MISTRAL_API_KEY="jJnyzvYcruSTj50bTqAEXlGl0rmxiXDm"

ENV_FILE=".env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "📝 Creating .env file..."
  touch "$ENV_FILE"
fi

# Backup existing .env
if [ -f "$ENV_FILE" ]; then
  BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "💾 Backing up existing .env to $BACKUP_FILE"
  cp "$ENV_FILE" "$BACKUP_FILE"
fi

echo ""
echo "📝 Updating .env file with production values..."
echo ""

# Function to update or add env variable
update_env_var() {
  local key=$1
  local value=$2
  
  # Escape special characters in value for sed
  local escaped_value=$(echo "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
  
  if grep -q "^${key}=" "$ENV_FILE"; then
    # Update existing variable
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      # Linux
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
    echo "  ✅ Updated: $key"
  else
    # Add new variable
    echo "${key}=${value}" >> "$ENV_FILE"
    echo "  ✅ Added: $key"
  fi
}

# Update environment variables
update_env_var "VITE_DATA_SOURCE" "supabase"
update_env_var "VITE_SUPABASE_URL" "$SUPABASE_URL"
update_env_var "VITE_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
update_env_var "VITE_CLERK_PUBLISHABLE_KEY" "$CLERK_PUBLISHABLE_KEY"

# Add Clerk configuration (optional, for reference)
update_env_var "CLERK_DOMAIN" "$CLERK_DOMAIN"
update_env_var "CLERK_INSTANCE_ID" "$CLERK_INSTANCE_ID"

echo ""
echo "✅ Local .env file updated!"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify Vercel environment variables match these values"
echo "   2. Deploy Edge Function: ./scripts/deploy-edge-function.sh"
echo "   3. Set Edge Function environment variables in Supabase Dashboard"
echo "   4. Check migration status: supabase migration list"
echo ""


# CLI Setup Guide for Clerk, Supabase, and Vercel

This guide explains how to set up CLI access to Clerk, Supabase, and Vercel for automated operations and management.

## Current Status

✅ **Supabase CLI**: Installed (v2.39.2) - **Needs authentication**  
❌ **Vercel CLI**: Not installed  
❌ **Clerk CLI**: Not available (Clerk uses API-based access instead)

---

## 1. Supabase CLI Setup

### Current Status
- CLI installed at: `/opt/homebrew/bin/supabase`
- Version: v2.39.2 (latest: v2.67.1)
- Authentication: **Not configured** (Unauthorized error)

### Step 1: Update Supabase CLI

```bash
# Update to latest version
brew upgrade supabase

# Or install via npm if preferred
npm install -g supabase
```

### Step 2: Authenticate with Supabase

**Option A: Browser-based authentication (Recommended)**
```bash
# Login to Supabase (opens browser)
supabase login

# This will:
# 1. Open your browser to authenticate
# 2. Save access token to ~/.supabase/access-token
# 3. Link your account for CLI operations
```

**Option B: Token-based authentication (For CI/CD or non-interactive environments)**
```bash
# Get token from: https://supabase.com/dashboard/account/tokens
# Then authenticate with token:
supabase login --token <your-access-token>

# Or set environment variable:
export SUPABASE_ACCESS_TOKEN=<your-access-token>
```

### Step 3: Link Your Project

```bash
# Link to your remote Supabase project
# Get project reference from Supabase Dashboard → Settings → General → Reference ID
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Verify connection
supabase projects list
```

### Step 4: Verify Authentication

```bash
# Check authentication status
supabase projects list

# Should show your projects without "Unauthorized" error
```

### Available Commands

```bash
# List all projects
supabase projects list

# Link to a project
supabase link --project-ref <project-ref>

# Check project status
supabase status

# List migrations
supabase migration list

# Generate migration from schema changes
supabase db diff

# Apply migrations (⚠️ Use with caution in production)
supabase db push

# Pull remote schema changes
supabase db pull
```

### Configuration Files

After linking, Supabase CLI creates:
- `~/.supabase/access-token` - Your authentication token
- `.supabase/config.toml` - Project configuration (if initialized locally)

---

## 2. Vercel CLI Setup

### Step 1: Install Vercel CLI

```bash
# Install globally via npm
npm install -g vercel

# Or via Homebrew (macOS)
brew install vercel-cli

# Verify installation
vercel --version
```

### Step 2: Authenticate with Vercel

**Option A: Browser-based authentication (Recommended)**
```bash
# Login to Vercel (opens browser)
vercel login

# This will:
# 1. Open browser for authentication
# 2. Save credentials to ~/.vercel/auth.json
# 3. Link your Vercel account
```

**Option B: Token-based authentication (For CI/CD or non-interactive environments)**
```bash
# Get token from: https://vercel.com/account/tokens
# Then authenticate with token:
vercel login -t <your-vercel-token>

# Or set environment variable:
export VERCEL_TOKEN=<your-vercel-token>
```

### Step 3: Link Your Project

```bash
# Navigate to project directory
cd /Users/kierangray/Projects/supafolio

# Link to existing Vercel project
vercel link

# Follow prompts:
# - Set up and deploy? No (if project already exists)
# - Which scope? Select your account/team
# - Link to existing project? Yes
# - Project name? supafolio (or your project name)
```

### Step 4: Verify Authentication

```bash
# List your projects
vercel projects list

# Check project details
vercel inspect

# View deployments
vercel ls
```

### Available Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# List deployments
vercel ls

# View deployment logs
vercel logs <deployment-url>

# View project settings
vercel inspect

# List environment variables
vercel env ls

# Add environment variable
vercel env add <key> <environment>

# Pull environment variables
vercel env pull .env.local

# View project domains
vercel domains ls
```

### Configuration Files

After linking, Vercel CLI creates:
- `~/.vercel/auth.json` - Your authentication credentials
- `.vercel/project.json` - Project configuration
- `.vercel/README.md` - Project documentation

---

## 3. Clerk Access Setup

### Important Note

**Clerk does not have an official CLI tool**. Instead, Clerk provides:

1. **REST API** - For programmatic access
2. **Dashboard** - Web-based management
3. **SDK** - For application integration

### Option 1: Clerk REST API (Recommended for Automation)

#### Step 1: Get API Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **API Keys** → **Backend API**
4. Copy your **Secret Key** (starts with `sk_`)

#### Step 2: Store API Key Securely

```bash
# Add to your environment (recommended)
export CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Or add to .env file (for scripts)
echo "CLERK_SECRET_KEY=sk_test_your_secret_key_here" >> .env
```

#### Step 3: Use Clerk API

```bash
# Example: List users via API
curl -X GET "https://api.clerk.com/v1/users" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY"

# Example: Get user details
curl -X GET "https://api.clerk.com/v1/users/{user_id}" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY"
```

### Option 2: Clerk SDK (For Application Code)

Already configured in your project:
- Package: `@clerk/clerk-react` (v5.59.2)
- Configuration: `src/main.tsx` with `ClerkProvider`
- Environment: `VITE_CLERK_PUBLISHABLE_KEY`

### Option 3: Create Custom CLI Script

You can create a custom script using Clerk's API:

```bash
# Create scripts/clerk-cli.sh
#!/bin/bash
CLERK_SECRET_KEY=${CLERK_SECRET_KEY:-""}

if [ -z "$CLERK_SECRET_KEY" ]; then
  echo "Error: CLERK_SECRET_KEY not set"
  exit 1
fi

# Example: List users
clerk_users() {
  curl -s -X GET "https://api.clerk.com/v1/users" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq
}

# Example: Get user by ID
clerk_user() {
  local user_id=$1
  curl -s -X GET "https://api.clerk.com/v1/users/$user_id" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq
}

# Add more functions as needed
```

---

## 4. Quick Setup Script

Create a setup script to automate CLI authentication:

```bash
#!/bin/bash
# scripts/setup-clis.sh

echo "🔧 Setting up CLI access for Supabase, Vercel, and Clerk..."

# 1. Supabase CLI
echo ""
echo "📦 Supabase CLI:"
if command -v supabase &> /dev/null; then
  echo "  ✅ Already installed: $(supabase --version)"
  echo "  🔐 Authenticating..."
  supabase login
  echo "  🔗 Linking project..."
  read -p "  Enter Supabase project reference ID: " project_ref
  supabase link --project-ref "$project_ref"
else
  echo "  ❌ Not installed. Install via: brew install supabase"
fi

# 2. Vercel CLI
echo ""
echo "🚀 Vercel CLI:"
if command -v vercel &> /dev/null; then
  echo "  ✅ Already installed: $(vercel --version)"
else
  echo "  📥 Installing Vercel CLI..."
  npm install -g vercel
fi
echo "  🔐 Authenticating..."
vercel login
echo "  🔗 Linking project..."
vercel link

# 3. Clerk API Key
echo ""
echo "🔑 Clerk API Access:"
if [ -z "$CLERK_SECRET_KEY" ]; then
  echo "  ⚠️  CLERK_SECRET_KEY not set"
  echo "  📝 Get your secret key from: https://dashboard.clerk.com → API Keys → Backend API"
  echo "  💡 Add to .env: CLERK_SECRET_KEY=sk_test_..."
else
  echo "  ✅ CLERK_SECRET_KEY is set"
fi

echo ""
echo "✅ CLI setup complete!"
```

---

## 5. Verification Checklist

After setup, verify each CLI:

### Supabase
```bash
# ✅ Should list your projects
supabase projects list

# ✅ Should show project status
supabase status

# ✅ Should list migrations
supabase migration list
```

### Vercel
```bash
# ✅ Should list your projects
vercel projects list

# ✅ Should show project info
vercel inspect

# ✅ Should list deployments
vercel ls
```

### Clerk
```bash
# ✅ Should authenticate API requests
curl -X GET "https://api.clerk.com/v1/users" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq '.data | length'
```

---

## 6. Environment Variables Summary

### Required for CLI Access

```bash
# Supabase (stored in ~/.supabase/access-token after login)
# No manual env var needed - handled by CLI

# Vercel (stored in ~/.vercel/auth.json after login)
# No manual env var needed - handled by CLI

# Clerk (requires manual setup)
export CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

### Application Environment Variables (Already Configured)

These are for your application, not CLI:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

---

## 7. Common Use Cases

### Deploy to Vercel
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Manage Supabase Migrations
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Check migration status
supabase migration list
```

### Manage Clerk Users (via API)
```bash
# List users
curl -X GET "https://api.clerk.com/v1/users" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq

# Create user
curl -X POST "https://api.clerk.com/v1/users" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_address":["user@example.com"]}'
```

---

## 8. Troubleshooting

### Supabase CLI Issues

**Error: "Unauthorized"**
```bash
# Re-authenticate
supabase login

# Check token exists
test -f ~/.supabase/access-token && echo "Token exists" || echo "No token"
```

**Error: "Cannot connect to Docker daemon"**
- This is for local Supabase development
- For remote operations, you don't need Docker
- Use `supabase link` to connect to remote project

### Vercel CLI Issues

**Error: "Not authenticated"**
```bash
# Re-authenticate
vercel login

# Check auth file exists
test -f ~/.vercel/auth.json && echo "Auth exists" || echo "No auth"
```

**Error: "Project not found"**
```bash
# Re-link project
vercel link

# Or create new project
vercel
```

### Clerk API Issues

**Error: "Unauthorized"**
- Verify `CLERK_SECRET_KEY` is set correctly
- Ensure you're using the **Secret Key** (starts with `sk_`), not publishable key
- Check key hasn't expired (regenerate if needed)

---

## 9. Security Best Practices

1. **Never commit CLI tokens/keys**
   - Add `~/.supabase/`, `~/.vercel/` to `.gitignore`
   - Add `.env` to `.gitignore` (already done)

2. **Use environment variables for secrets**
   - Store `CLERK_SECRET_KEY` in `.env` (not committed)
   - Use Vercel environment variables for production

3. **Rotate keys regularly**
   - Supabase: Regenerate access token via `supabase login`
   - Vercel: Regenerate via dashboard if compromised
   - Clerk: Regenerate secret keys via dashboard

4. **Limit CLI access**
   - Only install CLIs on trusted machines
   - Use read-only tokens when possible
   - Review CLI permissions regularly

---

## 10. Next Steps

After completing CLI setup:

1. ✅ **Test Supabase CLI**: Run `supabase projects list`
2. ✅ **Test Vercel CLI**: Run `vercel projects list`
3. ✅ **Test Clerk API**: Make a test API call
4. ✅ **Create helper scripts**: Add common operations to `scripts/` directory
5. ✅ **Document workflows**: Add CLI commands to your development workflow docs

---

## Summary

| Service | CLI Tool | Status | Authentication Method |
|---------|----------|--------|----------------------|
| **Supabase** | `supabase` | ✅ Installed (needs auth) | `supabase login` → Browser OAuth |
| **Vercel** | `vercel` | ❌ Not installed | `vercel login` → Browser OAuth |
| **Clerk** | N/A (API only) | ❌ Not configured | REST API with `CLERK_SECRET_KEY` |

**Action Items:**
1. Run `supabase login` to authenticate Supabase CLI
2. Install and run `vercel login` to authenticate Vercel CLI
3. Set `CLERK_SECRET_KEY` environment variable for Clerk API access


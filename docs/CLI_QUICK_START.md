# CLI Quick Start Guide

**Quick manual setup steps** - Run these commands in your terminal:

## 1. Supabase CLI Authentication

```bash
# This will open your browser for authentication
supabase login

# After login, link to your project
supabase link --project-ref auvtsvmtfrbpvgyvfqlx

# Verify it works
supabase projects list
```

**Expected output after login:**
- Browser opens for OAuth authentication
- Token saved to `~/.supabase/access-token`
- You can now run Supabase CLI commands

## 2. Vercel CLI Installation & Authentication

```bash
# Install globally
npm install -g vercel

# Authenticate (opens browser)
vercel login

# Link to your project (in project directory)
cd /Users/kierangray/Projects/wellthy
vercel link

# Verify it works
vercel projects list
```

**Expected output after login:**
- Browser opens for OAuth authentication
- Credentials saved to `~/.vercel/auth.json`
- Project linked in `.vercel/project.json`

## 3. Clerk API Access Setup

Clerk doesn't have a CLI, but you can access it via REST API:

```bash
# 1. Get your secret key from Clerk Dashboard:
#    https://dashboard.clerk.com → Your App → API Keys → Backend API
#    Copy the "Secret Key" (starts with sk_)

# 2. Add to your .env file:
echo "CLERK_SECRET_KEY=sk_test_your_key_here" >> .env

# 3. Source the environment variable
source .env

# 4. Test API access
curl -X GET "https://api.clerk.com/v1/users?limit=1" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq
```

**Expected output:**
- JSON response with user data (if you have users)
- HTTP 200 status code

## Verification Commands

After setup, verify everything works:

```bash
# Supabase
supabase projects list
supabase migration list

# Vercel
vercel projects list
vercel ls

# Clerk (if CLERK_SECRET_KEY is set)
curl -X GET "https://api.clerk.com/v1/users?limit=1" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq '.data | length'
```

## Troubleshooting

### Supabase: "Unauthorized" error
- Run `supabase login` again
- Check `~/.supabase/access-token` exists

### Vercel: "Not authenticated" error
- Run `vercel login` again
- Check `~/.vercel/auth.json` exists

### Clerk: "Unauthorized" API error
- Verify `CLERK_SECRET_KEY` is set: `echo $CLERK_SECRET_KEY`
- Ensure you're using the **Secret Key** (sk_), not publishable key (pk_)
- Check key hasn't expired in Clerk Dashboard

## Next Steps

Once authenticated, you can:

1. **Deploy to Vercel**: `vercel --prod`
2. **Manage Supabase migrations**: `supabase db push`
3. **Query Clerk users**: Use API endpoints with your secret key

See `docs/CLI_SETUP_GUIDE.md` for detailed documentation.


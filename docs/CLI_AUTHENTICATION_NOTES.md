# CLI Authentication Notes

## Why Browser Authentication is Required

Both **Supabase CLI** and **Vercel CLI** use OAuth 2.0 browser-based authentication by default. This means:

1. ✅ **More Secure**: Tokens are obtained securely via OAuth flow
2. ✅ **User-Friendly**: No need to manually copy/paste tokens
3. ❌ **Requires Browser**: Cannot be automated in non-interactive environments

## Current Limitation

When running `supabase login` or `vercel login` in a non-interactive terminal (like Cursor's AI terminal), the commands will:
- Time out or error
- Require manual browser interaction
- Cannot be fully automated

## Solutions

### Solution 1: Manual Authentication (Recommended for First-Time Setup)

Run these commands **directly in your terminal** (not via Cursor AI):

```bash
# Terminal 1: Supabase
supabase login
# Browser opens → Complete OAuth → Token saved automatically

# Terminal 2: Vercel  
vercel login
# Browser opens → Complete OAuth → Credentials saved automatically
```

After initial authentication, tokens are saved locally and CLI commands will work automatically.

### Solution 2: Token-Based Authentication (For Automation)

If you need to authenticate programmatically, you can use tokens:

#### Supabase Token Authentication

1. **Get Access Token**:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Copy the token

2. **Authenticate with Token**:
   ```bash
   # Method 1: Use --token flag
   supabase login --token <your-access-token>
   
   # Method 2: Use environment variable
   export SUPABASE_ACCESS_TOKEN=<your-access-token>
   ```

#### Vercel Token Authentication

1. **Get Access Token**:
   - Go to: https://vercel.com/account/tokens
   - Create a new token
   - Copy the token

2. **Authenticate with Token**:
   ```bash
   # Method 1: Use -t flag
   vercel login -t <your-vercel-token>
   
   # Method 2: Use environment variable
   export VERCEL_TOKEN=<your-vercel-token>
   ```

### Solution 3: Pre-Authenticate Before Using Cursor AI

If you want to use CLI commands via Cursor AI:

1. **Authenticate once manually** in your terminal:
   ```bash
   supabase login
   vercel login
   ```

2. **Verify tokens exist**:
   ```bash
   test -f ~/.supabase/access-token && echo "✅ Supabase authenticated"
   test -f ~/.vercel/auth.json && echo "✅ Vercel authenticated"
   ```

3. **Now CLI commands will work** in Cursor AI terminal since tokens are already saved

## Verification

After authentication (either method), verify it works:

```bash
# Supabase
supabase projects list

# Vercel
vercel projects list
```

## Security Notes

⚠️ **Important**: 
- Never commit authentication tokens to git
- Tokens are stored in `~/.supabase/` and `~/.vercel/` directories
- These directories should NOT be in your `.gitignore` (they're user-specific)
- For CI/CD, use environment variables with tokens, not browser auth

## Next Steps

1. **Run authentication manually** in your terminal (one-time setup)
2. **Verify tokens are saved** (check files exist)
3. **Test CLI commands** work
4. **Use CLI commands** via Cursor AI (they'll work now that you're authenticated)


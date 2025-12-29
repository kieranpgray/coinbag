# Clerk JWT Configuration Values for Supabase

## Your Configuration Values

### JWKS URL
```
https://clerk.coinbag.app/.well-known/jwks.json
```

### Issuer
```
https://clerk.coinbag.app
```

### Audience (Application ID)
**You need to get this from Clerk Dashboard:**
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys** section
4. Find your **Application ID** (format: `clerk_xxxxxxxxxxxxx` or similar)
5. Copy that value - that's your Audience

## Where to Configure in Supabase

Based on what you found (Project Settings → API → JWT Keys), you may need to:

1. **Look for a different tab** in Project Settings → API:
   - Check for tabs like "External JWT", "Custom JWT", or "Auth Providers"
   - The "JWT Keys" tab you're on is for Supabase's own keys, not external validation

2. **Or check Project Settings → Authentication**:
   - Look for "External JWT Providers" or "Custom JWT Configuration"
   - May be under a "Providers" or "External Auth" section

3. **If you can't find it in UI**, you may need to configure via SQL (see below)

## Configuration Fields Needed

When you find the right place, enter:

- **JWKS URL**: `https://clerk.coinbag.app/.well-known/jwks.json`
- **Issuer**: `https://clerk.coinbag.app`
- **Audience**: `<your-clerk-application-id>` (get from Clerk Dashboard)

## Alternative: Configure via SQL

If the UI option isn't available, you can configure via SQL Editor:

```sql
-- Note: Supabase may not expose this via SQL directly
-- But you can check current configuration:
SELECT * FROM auth.config;
```

## Next Steps

1. **Get your Clerk Application ID**:
   - Clerk Dashboard → API Keys → Application ID
   - Copy that value

2. **Find the External JWT settings** in Supabase:
   - Check Project Settings → API for other tabs
   - Check Project Settings → Authentication
   - Look for "External JWT" or "Custom JWT" options

3. **Enter the three values**:
   - JWKS URL: `https://clerk.coinbag.app/.well-known/jwks.json`
   - Issuer: `https://clerk.coinbag.app`
   - Audience: `<your-application-id>`

4. **Enable JWT verification** (toggle should be ON)

5. **Save** and wait 2-5 minutes for propagation

## Verification

After configuring, test with:

```sql
SELECT test_jwt_extraction();
```

Expected result (when signed in):
```json
{
  "jwt_exists": true,
  "has_sub": true,
  "user_id": "user_xxxxx",
  "status": "✅ JWT validation working"
}
```


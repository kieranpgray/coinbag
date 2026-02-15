# Step 4: Clerk JWT Configuration - Complete Guide

## Overview

This step configures Clerk to issue JWT tokens that Supabase can validate, enabling Row Level Security (RLS) to work correctly.

## Configuration Values

### Clerk Configuration
- **Domain**: `clerk.supafolio.app`
- **Instance ID**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

### Supabase Configuration
- **Project**: `auvtsvmtfrbpvgyvfqlx`
- **URL**: `https://auvtsvmtfrbpvgyvfqlx.supabase.co`

---

## Part 1: Create Clerk JWT Template

### Step 1.1: Get Supabase JWT Secret

1. Go to [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/settings/api)
2. Navigate to **Project Settings** → **API**
3. Find **"JWT Secret"** (long string)
4. Copy it - you'll need it for the Clerk template

### Step 1.2: Create JWT Template in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** (in left sidebar)
4. Click **"New template"** or **"Create template"**

### Step 1.3: Configure Template

Fill in these exact values:

- **Name**: `supabase` (lowercase, exactly - this is critical!)
- **Algorithm**: `HS256`
- **Signing Key**: Paste the Supabase JWT Secret from Step 1.1
- **Lifetime**: `3600` seconds

### Step 1.4: Add Claims

**⚠️ IMPORTANT**: Clerk automatically provides reserved claims. Only add the 2 custom claims below.

**Reserved Claims (DO NOT ADD - Clerk handles automatically)**:
- `sub` - User ID (automatically `{{user.id}}`)
- `iss` - Issuer (automatically your Clerk domain)
- `exp` - Expiration (automatically calculated)
- `iat` - Issued At (automatically current timestamp)
- `azp`, `fva`, `nbf`, `sid`, `v`, `fea` - Other reserved claims

**Custom Claims (ADD THESE 2 ONLY)**:

1. **role** (Role - must be exact string):
   - Key: `role`
   - Value: `"authenticated"` (with quotes - this is critical!)
   - **Purpose**: Tells Supabase this is an authenticated user

2. **aud** (Audience - Clerk Instance ID):
   - Key: `aud`
   - Value: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
   - **Purpose**: Required for Supabase JWT validation

**Final Claims JSON** (in Clerk's editor):
```json
{
  "role": "authenticated",
  "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
}
```

**Critical Notes**:
- The `role` claim MUST be the exact string `"authenticated"` (with quotes)
- The template name MUST be exactly `supabase` (lowercase)
- **DO NOT add** `sub`, `iss`, `exp`, or `iat` - Clerk provides these automatically
- If you try to add reserved claims, Clerk will show an error

### Step 1.5: Save Template

Click **"Save"** or **"Create template"**

---

## Part 2: Configure Supabase JWT Validation

### Step 2.1: Navigate to Authentication Settings

1. Go to [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx)
2. Navigate to **Authentication** (left sidebar)
3. Click **Settings** (or **URL Configuration**)

### Step 2.2: Configure JWT Validation

Look for **"JWT Settings"** or **"External OAuth Providers"** section.

**Option A: If "Third-Party Auth" or "External Providers" is available**:
1. Click **"Add provider"** or **"Configure Clerk"**
2. Enter your Clerk domain: `clerk.supafolio.app`
3. Save

**Option B: If "JWKS URL" configuration is available**:
1. Find **"JWKS URL"** field
2. Enter: `https://clerk.supafolio.app/.well-known/jwks.json`
3. Find **"Issuer"** field
4. Enter: `https://clerk.supafolio.app`
5. Find **"Audience"** field
6. Enter: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
7. Enable **"JWT Verification"** toggle (if present)
8. Click **"Save"**

### Step 2.3: Wait for Propagation

After saving, wait **2-5 minutes** for the configuration to propagate.

---

## Part 3: Verification

### Test 1: Verify JWKS URL is Accessible

Run this in terminal:
```bash
curl https://clerk.supafolio.app/.well-known/jwks.json
```

**Expected**: Should return JSON with a `keys` array

### Test 2: Test JWT Token in Browser

1. **Sign in** to your application (production or local)
2. **Open browser console** (F12)
3. **Run this code**:

```javascript
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Token retrieved');
      console.log('📋 Payload:', payload);
      console.log('Role:', payload.role); // Should be "authenticated"
      console.log('User ID:', payload.sub); // Should be your Clerk user ID
      console.log('Audience:', payload.aud); // Should be "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
      console.log('Issuer:', payload.iss); // Should be "https://clerk.supafolio.app"
      
      // Verify required claims
      if (payload.role === 'authenticated') {
        console.log('✅ Role claim is correct');
      } else {
        console.error('❌ Role claim is incorrect:', payload.role);
      }
      
      if (payload.sub) {
        console.log('✅ Sub claim (user ID) is present');
      } else {
        console.error('❌ Sub claim is missing');
      }
    } else {
      console.error('❌ No token returned - template might not exist');
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });
```

**Expected Results**:
- ✅ Token retrieved
- ✅ `role: "authenticated"`
- ✅ `sub: "user_xxxxx"` (your Clerk user ID)
- ✅ `aud: "ins_37VAGQw0JVza01qpTa6yUt8iVLY"`
- ✅ `iss: "https://clerk.supafolio.app"`

### Test 3: Test Supabase JWT Extraction

1. **Sign in** to your application first (important!)
2. Go to [Supabase SQL Editor](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new)
3. **Run this query**:

```sql
SELECT test_jwt_extraction();
```

**Expected Result** (when signed in):
```json
{
  "jwt_exists": true,
  "has_sub": true,
  "sub_claim": "user_xxxxx",
  "status": "JWT validation working correctly"
}
```

**If not signed in**, you'll see:
```json
{
  "jwt_exists": false,
  "has_sub": false,
  "status": "JWT validation NOT configured - auth.jwt() returns NULL"
}
```

**Note**: The SQL Editor runs without authentication context. To test properly:
- Sign in to your app first
- Then run the query
- OR test via your application code (see Test 4)

### Test 4: Test via Application

1. **Start your app** (if testing locally): `pnpm dev`
2. **Sign in** with Clerk
3. **Try creating data** (add an asset, expense, etc.)
4. **Check browser console** for errors
5. **Verify data persists** after refresh

If JWT is configured correctly:
- ✅ No RLS errors in console
- ✅ Data appears immediately
- ✅ Data persists after refresh

---

## Troubleshooting

### Issue: "Template not found" error

**Solution**:
- Check template name is exactly `supabase` (lowercase)
- Verify template exists in Clerk Dashboard

### Issue: `auth.jwt()` returns NULL

**Possible causes**:
1. Supabase JWT validation not configured
2. JWKS URL incorrect
3. Issuer/Audience mismatch
4. Configuration not propagated (wait 2-5 minutes)

**Solution**:
1. Verify Supabase JWT validation settings
2. Check JWKS URL is accessible: `curl https://clerk.supafolio.app/.well-known/jwks.json`
3. Verify Issuer and Audience match exactly
4. Wait a few minutes and try again

### Issue: Role claim missing or incorrect

**Solution**:
- In Clerk template, ensure `role` claim value is exactly `"authenticated"` (with quotes)
- Not `authenticated` (without quotes)
- Not `{{role}}` (not a variable)

### Issue: Sub claim missing

**Solution**:
- Verify `sub` claim in Clerk template uses `{{user.id}}` (with curly braces)
- Check that you're signed in when testing

---

## Success Criteria

- [ ] Clerk JWT template "supabase" exists
- [ ] Template has all required claims with correct values
- [ ] Supabase JWT validation configured
- [ ] JWKS URL is accessible
- [ ] Browser test shows token with correct claims
- [ ] `test_jwt_extraction()` returns `jwt_exists: true` (when signed in)
- [ ] Application can create/read data without RLS errors

---

## Quick Reference

**Clerk Template Claims** (only add these 2 - Clerk provides the rest automatically):
```json
{
  "role": "authenticated",
  "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
}
```

**Clerk automatically provides**:
- `sub` - User ID
- `iss` - Issuer (your Clerk domain)
- `exp` - Expiration
- `iat` - Issued At
- Other reserved claims

**Supabase JWT Validation**:
- JWKS URL: `https://clerk.supafolio.app/.well-known/jwks.json`
- Issuer: `https://clerk.supafolio.app`
- Audience: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`


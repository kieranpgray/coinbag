# Clerk JWT Template - Correct Claims Configuration

## Reserved Claims (Clerk Handles Automatically)

Clerk automatically provides these claims - **DO NOT add them manually**:

- `sub` - Subject (User ID) - Clerk automatically includes `{{user.id}}`
- `iss` - Issuer - Clerk automatically includes your Clerk domain
- `exp` - Expiration - Clerk automatically calculates based on token lifetime
- `iat` - Issued At - Clerk automatically includes current timestamp
- `azp`, `fva`, `nbf`, `sid`, `v`, `fea` - Other reserved claims

**Error**: If you try to add `exp`, `iat`, `iss`, or `sub`, Clerk will show: "You can't use the reserved claim: [claim_name]"

## Required Custom Claims (Add These Only)

For Supabase JWT validation, you only need to add **2 custom claims**:

### 1. `role` Claim
- **Key**: `role`
- **Value**: `"authenticated"` (with quotes - exact string, not a variable)
- **Purpose**: Tells Supabase this is an authenticated user (required for RLS)

### 2. `aud` Claim (Audience)
- **Key**: `aud`
- **Value**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY` (your Clerk Instance ID)
- **Purpose**: Identifies the intended audience for the token (required for Supabase JWT validation)

## Complete Claims Configuration

In Clerk's JWT Template editor, add only these 2 claims:

```json
{
  "role": "authenticated",
  "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
}
```

**Do NOT add**:
- ❌ `sub` (reserved - Clerk provides automatically)
- ❌ `iss` (reserved - Clerk provides automatically)
- ❌ `exp` (reserved - Clerk provides automatically)
- ❌ `iat` (reserved - Clerk provides automatically)

## Final Token Structure

After configuration, Clerk will issue tokens with this structure:

```json
{
  // Automatically provided by Clerk (reserved claims):
  "sub": "user_xxxxx",              // Your Clerk user ID
  "iss": "https://clerk.coinbag.app", // Your Clerk domain
  "exp": 1234567890,                 // Expiration timestamp
  "iat": 1234567890,                 // Issued at timestamp
  "azp": "...",                      // Other Clerk claims
  "sid": "...",
  // ... other reserved claims
  
  // Custom claims you added:
  "role": "authenticated",          // ✅ You added this
  "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY"  // ✅ You added this
}
```

## Step-by-Step in Clerk Dashboard

1. Go to **JWT Templates** → **New template** (or edit existing "supabase" template)

2. **Template Settings**:
   - Name: `supabase`
   - Algorithm: `HS256`
   - Signing Key: (Paste Supabase JWT Secret)
   - Lifetime: `3600` seconds

3. **In Claims Editor**, add only these 2 claims:

   **Claim 1: role**
   - Click "Add claim" or edit JSON directly
   - Key: `role`
   - Value: `"authenticated"` (with quotes)

   **Claim 2: aud**
   - Click "Add claim" or edit JSON directly
   - Key: `aud`
   - Value: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

4. **Final JSON in Claims Editor**:
   ```json
   {
     "role": "authenticated",
     "aud": "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
   }
   ```

5. Click **Save**

## Verification

After saving, test in browser console (while signed in):

```javascript
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Token:', payload);
      console.log('Role:', payload.role); // Should be "authenticated"
      console.log('User ID (sub):', payload.sub); // Should be your Clerk user ID (auto-provided)
      console.log('Audience:', payload.aud); // Should be "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
      console.log('Issuer:', payload.iss); // Should be "https://clerk.coinbag.app" (auto-provided)
    }
  });
```

**Expected**: All claims present, including both custom (`role`, `aud`) and reserved (`sub`, `iss`, `exp`, `iat`) claims.


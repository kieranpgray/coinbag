# Step 5: Test JWT Configuration

## Overview

Since Clerk is already configured in Supabase Third-Party Auth, we need to verify that JWT validation is working correctly.

## Test 1: Browser Console Test (While Signed In)

This is the most reliable test since it uses your actual authentication session.

1. **Sign in** to your production application (or local dev if testing locally)
2. **Open browser console** (F12 or right-click → Inspect → Console)
3. **Run this code**:

```javascript
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Token retrieved successfully');
      console.log('📋 Full payload:', payload);
      console.log('');
      console.log('Key Claims:');
      console.log('  Role:', payload.role); // Should be "authenticated"
      console.log('  User ID (sub):', payload.sub); // Should be your Clerk user ID (e.g., "user_xxxxx")
      console.log('  Audience:', payload.aud); // Should be "ins_37VAGQw0JVza01qpTa6yUt8iVLY"
      console.log('  Issuer:', payload.iss); // Should be "https://clerk.coinbag.app"
      console.log('');
      
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
      
      if (payload.aud === 'ins_37VAGQw0JVza01qpTa6yUt8iVLY') {
        console.log('✅ Audience claim is correct');
      } else {
        console.warn('⚠️  Audience claim:', payload.aud);
      }
      
      if (payload.iss === 'https://clerk.coinbag.app') {
        console.log('✅ Issuer claim is correct');
      } else {
        console.warn('⚠️  Issuer claim:', payload.iss);
      }
      
      // Overall status
      if (payload.role === 'authenticated' && payload.sub) {
        console.log('');
        console.log('🎉 JWT configuration is working correctly!');
      } else {
        console.log('');
        console.error('❌ JWT configuration has issues');
      }
    } else {
      console.error('❌ No token returned');
      console.error('   → Check if Clerk JWT template "supabase" exists');
      console.error('   → Make sure you are signed in');
    }
  })
  .catch(error => {
    console.error('❌ Error getting token:', error);
  });
```

**Expected Results**:
- ✅ Token retrieved successfully
- ✅ `role: "authenticated"`
- ✅ `sub: "user_xxxxx"` (your Clerk user ID)
- ✅ `aud: "ins_37VAGQw0JVza01qpTa6yUt8iVLY"`
- ✅ `iss: "https://clerk.coinbag.app"`

## Test 2: Supabase JWT Extraction (SQL Editor)

**Note**: This test requires you to be signed in to your app first, then run the query.

1. **Sign in** to your application (important!)
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

**Note**: The SQL Editor runs without authentication context, so this test may show `jwt_exists: false` even if JWT is configured. The browser console test (Test 1) is more reliable.

## Test 3: Application Functionality Test

1. **Sign in** to your application
2. **Try creating data**:
   - Add an asset
   - Add an expense
   - Add a goal
3. **Check browser console** for errors
4. **Verify data persists**:
   - Refresh the page
   - Logout and login again
   - Data should still be there

**If JWT is working correctly**:
- ✅ No RLS errors in console
- ✅ Data appears immediately
- ✅ Data persists after refresh
- ✅ No "permission denied" errors

## Troubleshooting

### Issue: Token shows `role: "anon"` instead of `"authenticated"`

**Possible causes**:
1. Clerk JWT template not configured correctly
2. Template name is not exactly "supabase"
3. `role` claim value is not exactly `"authenticated"` (with quotes)

**Solution**:
- Verify Clerk JWT template exists and is named "supabase"
- Check that `role` claim value is exactly `"authenticated"` (string, not variable)

### Issue: Token missing `sub` claim

**Possible causes**:
1. Clerk template not configured
2. Not signed in

**Solution**:
- Verify you're signed in
- Check Clerk JWT template exists

### Issue: `test_jwt_extraction()` returns `jwt_exists: false`

**Possible causes**:
1. Running query without being signed in
2. Supabase JWT validation not fully configured
3. Configuration not propagated yet

**Solution**:
- Make sure you're signed in to your app first
- Wait a few minutes after configuring (propagation time)
- Use browser console test instead (more reliable)

## Success Criteria

- [ ] Browser console test shows `role: "authenticated"`
- [ ] Browser console test shows `sub: "user_xxxxx"`
- [ ] Application can create/read data without errors
- [ ] Data persists after refresh
- [ ] No RLS errors in console


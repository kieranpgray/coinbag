# ✅ Clerk JWT Configuration Complete

## Configuration Summary

**Clerk has been successfully configured in Supabase!**

### Values Configured:
- **JWKS URL**: `https://clerk.coinbag.app/.well-known/jwks.json`
- **Issuer**: `https://clerk.coinbag.app`
- **Audience**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

## Next Steps: Verification

### 1. Test JWT Extraction (SQL Editor)

Go to Supabase Dashboard → SQL Editor and run:

```sql
SELECT test_jwt_extraction();
```

**Expected Result** (when signed in to your app):
```json
{
  "jwt_exists": true,
  "has_sub": true,
  "user_id": "user_xxxxx",
  "status": "✅ JWT validation working"
}
```

**If not signed in**, you'll see:
```json
{
  "jwt_exists": false,
  "has_sub": false,
  "user_id": null,
  "status": "❌ JWT validation NOT configured"
}
```

**Note**: To test properly, you need to be signed in to your app first, then run the SQL query.

### 2. Test via Your Application

1. **Start your dev server** (if testing locally):
   ```bash
   pnpm dev
   ```

2. **Sign in** with Clerk in your app

3. **Create test data**:
   - Add an asset, liability, subscription, or goal
   - Verify it appears immediately

4. **Test persistence**:
   - Refresh the page
   - Logout and login again
   - Verify data persists

5. **Check browser console**:
   - Look for any JWT or Supabase errors
   - Should see successful queries

### 3. Verify RLS Policies Work

Run this SQL in Supabase SQL Editor (while signed in):

```sql
-- Check if auth.jwt() returns your user ID
SELECT 
  auth.jwt() ->> 'sub' as user_id,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ NOT CONFIGURED'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️ CONFIGURED BUT NO SUB'
    ELSE '✅ WORKING'
  END as status;
```

**Expected**: Should show your Clerk user ID and "✅ WORKING"

### 4. Verify Tables and Data

1. **Check tables exist**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   Expected: 8 tables (subscriptions, categories, user_preferences, assets, liabilities, accounts, income, goals)

2. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   Expected: All tables should show `rowsecurity = true`

## Production Deployment Checklist

- [x] ✅ All migrations executed (12/12)
- [x] ✅ Clerk JWT validation configured
- [x] ✅ Vercel environment variables set
- [ ] ⏳ JWT extraction test passes
- [ ] ⏳ Data persistence verified
- [ ] ⏳ Production deployment successful

## Troubleshooting

### If `auth.jwt()` returns NULL:

1. **Wait 2-5 minutes** after configuration (propagation time)
2. **Sign out and sign back in** to get fresh JWT
3. **Verify configuration** in Supabase Dashboard
4. **Check Clerk domain** matches exactly

### If RLS policies block queries:

1. Verify JWT validation is working (`SELECT test_jwt_extraction();`)
2. Check policies use `auth.jwt() ->> 'sub'` (NOT `auth.uid()`)
3. Verify `user_id` values in database match Clerk user IDs

### If data doesn't persist:

1. Check `VITE_DATA_SOURCE=supabase` in Vercel
2. Verify Supabase URL and anon key are correct
3. Check browser console for errors
4. Verify JWT is being sent (check Network tab → Authorization header)

## Configuration Reference

**Clerk Configuration**:
- Frontend API URL: `https://clerk.coinbag.app`
- JWKS URL: `https://clerk.coinbag.app/.well-known/jwks.json`
- Instance ID: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

**Supabase Configuration**:
- Project: `auvtsvmtfrbpvgyvfqlx`
- URL: `https://auvtsvmtfrbpvgyvfqlx.supabase.co`
- Clerk configured as external auth provider ✅

---

**🎉 Configuration Complete!** Your Supabase database is now ready to validate Clerk JWTs and enforce RLS policies correctly.


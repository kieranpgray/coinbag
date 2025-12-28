# Data Persistence Reliability Improvements

This document outlines the critical reliability improvements made to prevent data loss and ensure data integrity.

## Critical Issues Fixed

### 1. **Explicit user_id Setting (CRITICAL)**

**Problem**: Previously, repositories relied entirely on database defaults (`auth.jwt() ->> 'sub'`) to set `user_id`. If Supabase JWT validation wasn't configured, this would silently fail and insert records with `NULL` user_id, causing data to be invisible to users.

**Solution**: 
- Added `extractUserIdFromToken()` function to explicitly extract user_id from JWT
- Added `ensureUserIdForInsert()` helper to validate user_id before inserts
- All repositories now **explicitly set `user_id`** in insert operations
- If user_id cannot be extracted, the operation **fails immediately** with a clear error

**Impact**: 
- ✅ Prevents NULL user_id values
- ✅ Fails fast if JWT validation isn't configured
- ✅ Provides clear error messages to users

**Files Changed**:
- `src/lib/jwtDiagnostics.ts` - Added `extractUserIdFromToken()`
- `src/lib/repositoryHelpers.ts` - Added `ensureUserIdForInsert()` and `verifyInsertedUserId()`
- All Supabase repositories (assets, liabilities, accounts, income, goals)

### 2. **Post-Insert user_id Verification**

**Problem**: Even with explicit user_id setting, database constraints or RLS policies could potentially override it. We had no way to detect if the inserted record had the wrong user_id.

**Solution**:
- Added `verifyInsertedUserId()` function to verify inserted records
- After every insert, we verify the returned `user_id` matches the expected value
- Logs critical errors if user_id doesn't match
- Provides diagnostic information for troubleshooting

**Impact**:
- ✅ Catches data integrity issues immediately
- ✅ Provides early warning if JWT validation fails
- ✅ Helps diagnose configuration problems

**Files Changed**:
- `src/lib/repositoryHelpers.ts` - Added `verifyInsertedUserId()`
- All Supabase repositories now verify user_id after insert

### 3. **JWT Token Expiration Handling**

**Problem**: We cached Supabase clients by JWT token, but if a token expired, we'd continue using an expired token, causing authentication failures.

**Solution**:
- Added `isTokenExpiredOrExpiringSoon()` function to check token expiration
- Before using cached client, check if token is expired or expiring within 60 seconds
- If expired, clear cache and get fresh token
- Create new client with fresh token

**Impact**:
- ✅ Prevents using expired tokens
- ✅ Automatically refreshes tokens when needed
- ✅ Reduces authentication errors

**Files Changed**:
- `src/lib/jwtDiagnostics.ts` - Added `isTokenExpiredOrExpiringSoon()`
- `src/lib/supabaseClient.ts` - Added expiration check before using cached clients

### 4. **Enhanced Error Logging**

**Problem**: When data integrity issues occurred, we had limited diagnostic information.

**Solution**:
- Added comprehensive logging for user_id extraction
- Added logging for user_id verification
- Added warnings for expired tokens
- Added error context for troubleshooting

**Impact**:
- ✅ Better visibility into data integrity issues
- ✅ Easier troubleshooting
- ✅ Early detection of problems

## Reliability Guarantees

With these improvements, we now have:

1. **Guaranteed user_id Setting**: Every insert operation explicitly sets user_id from JWT. If user_id cannot be extracted, the operation fails with a clear error.

2. **Post-Insert Verification**: Every inserted record is verified to have the correct user_id. If verification fails, critical errors are logged.

3. **Token Expiration Handling**: Expired tokens are automatically detected and refreshed, preventing authentication failures.

4. **Fail-Fast Behavior**: If JWT validation isn't configured or user_id cannot be extracted, operations fail immediately rather than silently creating invalid data.

## Testing Recommendations

To verify these improvements work:

1. **Test with JWT Validation Configured**:
   - Create data (assets, liabilities, etc.)
   - Verify user_id is set correctly in database
   - Verify data persists after logout/login

2. **Test with JWT Validation NOT Configured**:
   - Temporarily disable JWT validation in Supabase
   - Attempt to create data
   - Verify operation fails with clear error message
   - Verify NO data is inserted with NULL user_id

3. **Test Token Expiration**:
   - Wait for JWT token to expire (or manually expire it)
   - Attempt to create data
   - Verify token is automatically refreshed
   - Verify operation succeeds

4. **Test user_id Verification**:
   - Enable debug logging: `VITE_DEBUG_LOGGING=true`
   - Create data
   - Check logs for user_id verification messages
   - Verify user_id matches expected value

## Migration Notes

These improvements are **backward compatible**:
- Existing data is not affected
- New inserts will have explicit user_id (more reliable)
- Database defaults still work as fallback (but we don't rely on them)

## Monitoring

To monitor data integrity:

1. **Check Logs**: Look for `DB:USER_ID_VERIFICATION` errors
2. **Check Database**: Query for NULL user_id values:
   ```sql
   SELECT COUNT(*) FROM assets WHERE user_id IS NULL;
   SELECT COUNT(*) FROM liabilities WHERE user_id IS NULL;
   -- etc.
   ```
3. **Enable Debug Logging**: Set `VITE_DEBUG_LOGGING=true` to see detailed user_id extraction and verification logs

## Future Improvements

Potential additional improvements:

1. **Automatic Data Recovery**: If NULL user_id is detected, attempt to recover using audit logs
2. **Periodic Integrity Checks**: Run scheduled checks for data integrity issues
3. **User Notification**: Alert users if data integrity issues are detected
4. **Retry Logic**: Add retry logic for transient authentication failures

## Summary

These improvements significantly increase confidence that:
- ✅ Data will always have correct user_id
- ✅ Data loss due to NULL user_id is prevented
- ✅ Authentication failures are handled gracefully
- ✅ Data integrity issues are detected immediately
- ✅ Users get clear error messages when something goes wrong

The system now **fails fast** rather than silently creating invalid data, which is much safer and easier to debug.


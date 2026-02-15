# Security Hardening Guide

This document outlines comprehensive security measures to ensure your Supafolio application is production-hardened, including encryption at rest and in transit.

## Encryption at Rest

### Supabase Database Encryption

**✅ Already Configured**: Supabase automatically encrypts all data at rest using **AES-256 encryption**.

**What This Means**:
- All database data is encrypted on disk
- All backups are encrypted
- No additional configuration required
- Industry-standard encryption (AES-256)

**Verification**:
- Supabase handles this automatically - no action needed
- Check Supabase Dashboard → Project Settings → Security for encryption status
- All data stored in Supabase is encrypted at rest by default

### Supabase Vault (For Sensitive Secrets)

**Optional Enhancement**: For highly sensitive data (API keys, tokens, etc.), use Supabase Vault:

1. **Enable Vault** in Supabase Dashboard
2. **Store Secrets**: Use Vault for sensitive configuration
3. **Access via API**: Retrieve secrets programmatically with proper authentication

**When to Use**:
- Storing third-party API keys
- Storing encryption keys
- Storing other sensitive configuration

**Note**: For most use cases, environment variables in Vercel are sufficient. Vault is for extra-sensitive data.

### Clerk Data Encryption

**✅ Already Configured**: Clerk encrypts all authentication data at rest and in transit.

**What This Means**:
- User credentials encrypted at rest
- JWT tokens encrypted in transit
- No additional configuration needed

## Encryption in Transit (HTTPS/TLS)

### Production HTTPS

**✅ Vercel Provides**: Vercel automatically provides HTTPS with Let's Encrypt certificates.

**Verification**:
- [ ] Production URL uses `https://` (not `http://`)
- [ ] Browser shows padlock icon
- [ ] Certificate is valid (not self-signed)
- [ ] TLS 1.2 or higher is used

**Configuration**:
- Vercel handles this automatically
- Custom domains get free SSL certificates
- No manual configuration needed

### Security Headers

**Action Required**: Configure security headers in Vercel.

**Create `vercel.json`**:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://*.clerk.accounts.dev;"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

**Security Headers Explained**:
- **HSTS**: Forces HTTPS for 1 year
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Basic XSS protection
- **Referrer-Policy**: Controls referrer information
- **Content-Security-Policy**: Restricts resource loading
- **Permissions-Policy**: Restricts browser features

## API Key Security

### Environment Variables

**✅ Already Secure**: Environment variables in Vercel are encrypted.

**Best Practices**:
- [ ] Never commit `.env` files to git (already in `.gitignore`)
- [ ] Use Vercel environment variables (not hardcoded)
- [ ] Rotate keys periodically
- [ ] Use different keys for dev/prod
- [ ] Never expose service role keys in client code

### Clerk Key Validation

**Action Required**: Add validation to prevent test keys in production.

**Enhance `scripts/validate-build-env.js`**:
```javascript
// Add Clerk key format check
const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
if (isProduction && clerkKey && clerkKey.startsWith('pk_test_')) {
  console.error('');
  console.error('❌ BUILD FAILED: Test Clerk key detected in production');
  console.error('   Use production key (pk_live_...) in production');
  console.error('');
  process.exit(1);
}
```

### Supabase Key Security

**✅ Already Secure**: Only anon key is exposed (safe for client-side).

**Important**:
- ✅ Anon key is safe to expose (it's public)
- ❌ Service role key must NEVER be exposed
- ✅ RLS policies protect data even with exposed anon key

## Row Level Security (RLS)

### Current Status

**✅ Already Implemented**: All tables have RLS policies.

**Verification**:
- [ ] RLS enabled on all tables
- [ ] Policies use `auth.jwt() ->> 'sub'` (not `auth.uid()`)
- [ ] Policies cover SELECT, INSERT, UPDATE, DELETE
- [ ] User isolation tested and verified

**SQL Verification**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('assets', 'liabilities', 'accounts', 'income', 'subscriptions', 'goals', 'categories', 'user_preferences');

-- Check policies exist
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Input Validation

### Current Status

**✅ Already Implemented**: Zod schemas validate all inputs.

**Verification**:
- [ ] All forms use Zod validation
- [ ] API responses validated
- [ ] No raw user input in SQL queries
- [ ] Type safety enforced

**Files to Review**:
- `src/contracts/*.ts` - All Zod schemas
- Form components - All use react-hook-form with Zod

## CORS Configuration

### Supabase CORS

**Action Required**: Configure CORS in Supabase Dashboard.

**Steps**:
1. Go to Supabase Dashboard → Settings → API
2. Add production domain to allowed origins
3. Remove `*` wildcard if present
4. Use specific domains only

**Example**:
```
https://supafolio.vercel.app
https://www.supafolio.com
```

**Never Use**:
```
*  # Too permissive
```

### Clerk CORS

**✅ Already Configured**: Clerk handles CORS automatically.

**Verification**:
- Clerk redirect URLs configured correctly
- Production domain added to Clerk dashboard

## Secrets Management

### Environment Variables

**Current Approach**: Vercel environment variables (encrypted at rest).

**Best Practices**:
- [ ] Use Vercel's environment variable encryption
- [ ] Separate dev/prod environments
- [ ] Rotate keys every 90 days (recommended)
- [ ] Never log environment variables
- [ ] Use secrets manager for highly sensitive data

### Key Rotation Plan

**Schedule**:
- Clerk keys: Every 90 days
- Supabase keys: Every 90 days (if service role key exposed)
- Database password: Every 180 days

**Process**:
1. Generate new keys
2. Update in Vercel environment variables
3. Update in Supabase/Clerk dashboards
4. Redeploy application
5. Verify functionality
6. Revoke old keys after 7 days

## Additional Security Measures

### 1. Database Backups

**Action Required**: Configure automated backups in Supabase.

**Steps**:
1. Go to Supabase Dashboard → Settings → Database
2. Enable Point-in-Time Recovery (PITR)
3. Configure backup retention (7-30 days recommended)
4. Test restore procedure

### 2. Access Logging

**Action Required**: Enable audit logging.

**Supabase**:
- Enable query logging in Supabase Dashboard
- Monitor for suspicious activity
- Set up alerts for failed authentication attempts

**Clerk**:
- Monitor authentication logs
- Set up alerts for suspicious sign-ins
- Review user activity regularly

### 3. Rate Limiting

**Current Status**: Handled by Supabase and Clerk.

**Verification**:
- [ ] Supabase rate limits configured (default)
- [ ] Clerk rate limits configured (default)
- [ ] Consider additional rate limiting if needed

### 4. Error Handling

**Action Required**: Ensure no sensitive data in error messages.

**Review**:
- [ ] Error messages don't expose database structure
- [ ] Error messages don't expose API keys
- [ ] Error messages don't expose user data
- [ ] Generic error messages for users
- [ ] Detailed errors only in server logs

### 5. Dependency Security

**Action Required**: Regular dependency updates.

**Tools**:
- `pnpm audit` - Check for vulnerabilities
- Dependabot (GitHub) - Automatic updates
- Regular `pnpm update` - Keep dependencies current

**Schedule**:
- Weekly: Review security advisories
- Monthly: Update dependencies
- Quarterly: Major version updates

## Security Checklist

### Pre-Production

- [ ] HTTPS enabled (Vercel automatic)
- [ ] Security headers configured (`vercel.json`)
- [ ] CORS configured (specific domains only)
- [ ] RLS policies verified
- [ ] Input validation verified
- [ ] Environment variables secured
- [ ] No test keys in production
- [ ] Database backups enabled
- [ ] Error messages sanitized
- [ ] Dependencies updated

### Post-Production

- [ ] Security headers verified (use browser dev tools)
- [ ] HTTPS verified (padlock icon)
- [ ] CORS tested
- [ ] RLS tested (user isolation)
- [ ] Rate limiting tested
- [ ] Error handling tested
- [ ] Monitoring configured
- [ ] Alerts configured

## Monitoring & Alerts

### Recommended Monitoring

1. **Failed Authentication Attempts**
   - Alert threshold: > 10 per hour
   - Source: Clerk dashboard

2. **Database Errors**
   - Alert threshold: > 5 per hour
   - Source: Supabase dashboard

3. **RLS Policy Violations**
   - Alert threshold: Any
   - Source: Supabase logs

4. **Unusual API Activity**
   - Alert threshold: > 1000 requests/hour
   - Source: Vercel analytics

## Compliance Considerations

### Data Protection

- **Encryption at Rest**: ✅ Supabase AES-256
- **Encryption in Transit**: ✅ HTTPS/TLS
- **Access Controls**: ✅ RLS policies
- **Audit Logging**: ⚠️ Configure in Supabase
- **Data Retention**: ⚠️ Configure backup retention

### Privacy

- **User Data Isolation**: ✅ RLS policies
- **Data Minimization**: ✅ Only collect necessary data
- **Right to Deletion**: ⚠️ Implement user data deletion
- **Privacy Policy**: ⚠️ Create and link privacy policy

## Files to Create/Modify

### Must Create:
- `vercel.json` - Security headers configuration

### Must Modify:
- `scripts/validate-build-env.js` - Add Clerk key validation
- `docs/SECURITY_HARDENING.md` - This document

### Optional Enhancements:
- Error boundary component (sanitize errors)
- Rate limiting middleware
- Security monitoring dashboard

## Quick Reference

### Verify Encryption at Rest
- Supabase: Automatic (AES-256)
- Clerk: Automatic
- **No action needed** - already configured

### Verify Encryption in Transit
- Vercel: Automatic HTTPS
- **Action**: Verify padlock icon in browser

### Verify Security Headers
- **Action**: Create `vercel.json` with headers
- **Verify**: Use browser dev tools → Network → Headers

### Verify RLS Policies
- **Action**: Run SQL verification queries
- **Verify**: Test user isolation

## Support

If you have security concerns:
1. Review this document
2. Check Supabase security documentation
3. Check Clerk security documentation
4. Review Vercel security best practices
5. Consider security audit if handling sensitive financial data


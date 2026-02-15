# Security Remediation Plan

## 🚨 Critical Security Alert

GitHub detected exposed secrets in commit `c4b64e67`. Immediate action required.

## Exposed Secrets

### 1. Mistral AI API Key (Production)
- **Location**: `scripts/update-production-config.sh` (line 17)
- **Location**: `scripts/deploy-edge-function.sh` (line 64)
- **Key**: (redacted; if ever committed, revoke and rotate)
- **Severity**: 🔴 **CRITICAL** - Production API key exposed

### 2. Supabase Service Role Key (Development)
- **Location**: `scripts/verify-statement-bucket.js` (line 9)
- **Location**: `scripts/create-statement-bucket-direct.js` (line 18)
- **Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (dev project)
- **Severity**: 🟠 **HIGH** - Service role key has full database access

### 3. Supabase Anon Key (Production)
- **Location**: Multiple files (less critical, but should use env vars)
- **Severity**: 🟡 **MEDIUM** - Anon keys are meant to be public, but best practice is env vars

## Immediate Actions Required

### Step 1: Rotate Exposed Keys (URGENT)

#### Mistral AI API Key
1. **Go to**: https://console.mistral.ai/
2. **Navigate to**: API Keys section
3. **Revoke** the exposed key in the Mistral dashboard and create a new one.
4. **Generate** a new API key
5. **Update** in:
   - Supabase Edge Function environment variables
   - Vercel environment variables (if used)
   - Local `.env` file

#### Supabase Service Role Key (Dev)
1. **Go to**: Supabase Dashboard → Project Settings → API
2. **Regenerate** the service_role key for dev project
3. **Update** in:
   - Local `.env` file
   - Any CI/CD secrets
   - Script execution environment

### Step 2: Remove Secrets from Git History

The secrets are now removed from the codebase, but they still exist in git history.

**Option A: Accept Risk (Recommended for now)**
- The secrets are already exposed in commit history
- Rotating keys is more important than rewriting history
- Focus on preventing future exposure

**Option B: Rewrite Git History (Advanced)**
```bash
# WARNING: This rewrites history and requires force push
# Only do this if you understand the implications
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch scripts/update-production-config.sh scripts/deploy-edge-function.sh scripts/verify-statement-bucket.js scripts/create-statement-bucket-direct.js" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team first!)
git push origin --force --all
```

### Step 3: Verify Fixes Applied

All affected files have been updated to:
- ✅ Require environment variables instead of hardcoded values
- ✅ Validate environment variables are set before execution
- ✅ Display clear error messages if variables are missing

**Files Fixed:**
- `scripts/update-production-config.sh`
- `scripts/deploy-edge-function.sh`
- `scripts/verify-statement-bucket.js`
- `scripts/create-statement-bucket-direct.js`
- `scripts/update-supabase-anon-key.sh`

## Prevention Measures

### 1. Pre-commit Hooks
The repository already has pre-commit hooks that check for secrets. Ensure they're active:
```bash
# Verify husky is installed
pnpm prepare

# Test pre-commit hook
git commit --dry-run
```

### 2. GitHub Secret Scanning
GitHub automatically scans for secrets. Ensure:
- ✅ Secret scanning is enabled in repository settings
- ✅ Alerts are sent to repository admins
- ✅ Regular review of security alerts

### 3. Environment Variables Best Practices

**✅ DO:**
- Store secrets in environment variables
- Use `.env` files (already in `.gitignore`)
- Use Vercel/Supabase dashboard for production secrets
- Use CI/CD secret management (GitHub Secrets, etc.)

**❌ DON'T:**
- Hardcode secrets in source code
- Commit `.env` files
- Share secrets in chat/email
- Use secrets in example/documentation files

### 4. Code Review Checklist

Before committing, check:
- [ ] No API keys or tokens in code
- [ ] No passwords or credentials
- [ ] No service role keys
- [ ] All secrets use environment variables
- [ ] `.env` files are in `.gitignore`

## Testing After Remediation

1. **Verify scripts work with environment variables:**
   ```bash
   # Test update-production-config.sh
   SUPABASE_URL=https://xxx.supabase.co \
   SUPABASE_ANON_KEY=xxx \
   CLERK_PUBLISHABLE_KEY=xxx \
   ./scripts/update-production-config.sh
   
   # Test verify-statement-bucket.js
   SUPABASE_URL=https://xxx.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=xxx \
   node scripts/verify-statement-bucket.js
   ```

2. **Verify Edge Function still works:**
   - Check Supabase Dashboard → Edge Functions → Settings
   - Ensure `MISTRAL_API_KEY` is set in environment variables
   - Test function execution

3. **Verify production deployment:**
   - Check Vercel environment variables
   - Verify application works in production

## Timeline

- **Immediate (Now)**: Rotate exposed keys
- **Within 24 hours**: Verify all fixes are applied
- **Within 1 week**: Review all scripts for hardcoded secrets
- **Ongoing**: Monitor GitHub security alerts

## Additional Resources

- [GitHub Secret Scanning Documentation](https://docs.github.com/en/code-security/secret-scanning)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)

## Questions or Issues?

If you encounter issues during remediation:
1. Check the error messages in the updated scripts
2. Verify environment variables are set correctly
3. Review Supabase/Vercel dashboard for configuration
4. Consult the security team if needed

---

**Last Updated**: $(date)
**Status**: 🔴 Remediation in progress - Keys need rotation


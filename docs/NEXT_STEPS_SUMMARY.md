# Next Steps Summary

## Current Status

✅ **Completed**:
- Step 1: Vercel environment variables verified
- Step 2: Edge Function deployed
- Step 3: Edge Function environment variables (MISTRAL_API_KEY only)
- Step 4 Part 1: Clerk JWT template created

⚠️ **In Progress**:
- Step 4 Part 2: Supabase JWT validation configuration
- Step 5: JWT testing
- Step 6: Migration verification

## Immediate Next Steps

### 1. Configure Supabase JWT Validation (5 minutes)

**Location**: [Supabase Dashboard → Authentication → Settings](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/auth/url-configuration)

**Configuration**:
- JWKS URL: `https://clerk.coinbag.app/.well-known/jwks.json`
- Issuer: `https://clerk.coinbag.app`
- Audience: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
- Enable JWT Verification

**After saving**: Wait 2-5 minutes for propagation

### 2. Test JWT Configuration (2 minutes)

**In browser console** (while signed in):
```javascript
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('Role:', payload.role); // Should be "authenticated"
    console.log('User ID:', payload.sub); // Should be your Clerk user ID
  });
```

**Expected**: `role: "authenticated"` and `sub: "user_xxxxx"`

### 3. Check Migration Status

**Run**:
```bash
supabase migration list --project-ref auvtsvmtfrbpvgyvfqlx
```

**If migrations are missing**:
```bash
./scripts/run-migrations-via-cli.sh
```

**Missing tables detected**:
- `user_preferences` (may need migration)
- `ocr_results` (may need migration)

### 4. Final Verification

**Run verification script**:
```bash
npx tsx scripts/verify-complete-setup.ts
```

**Expected results**:
- ✅ JWKS URL accessible
- ✅ JWT extraction shows `has_sub: true` and `role: "authenticated"`
- ✅ All required tables exist

## Complete Checklist

- [x] Step 1: Vercel environment variables
- [x] Step 2: Edge Function deployed
- [x] Step 3: Edge Function env vars (MISTRAL_API_KEY)
- [x] Step 4 Part 1: Clerk JWT template
- [ ] Step 4 Part 2: Supabase JWT validation
- [ ] Step 5: JWT testing
- [ ] Step 6: Migration verification
- [ ] Step 7: End-to-end testing

## Documentation

- Step 4 Part 2: `docs/STEP4_PART2_SUPABASE_JWT.md`
- Complete JWT guide: `docs/STEP4_CLERK_JWT_CONFIG.md`
- Correct claims: `docs/CLERK_JWT_TEMPLATE_CLAIMS_CORRECT.md`


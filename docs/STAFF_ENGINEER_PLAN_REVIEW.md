# Staff Engineer Plan Review: Clerk Key Dev/Prod Segregation

## Executive Summary

**Plan Status**: ✅ **Sound approach with critical gaps identified**

The plan correctly identifies the root cause and proposes a valid solution, but requires enhancements for production safety, edge case handling, and CI/CD compatibility.

---

## ✅ Strengths

1. **Correct Problem Identification**: Accurately identifies production keys being used in development
2. **Standard Vite Pattern**: Uses industry-standard `.env` vs `.env.production` approach
3. **Clear Separation**: Properly segregates dev and prod concerns
4. **Validation Consideration**: Includes validation phase (though needs enhancement)

---

## ⚠️ Critical Gaps & Risks

### 1. **Vite Mode Loading Behavior** (HIGH RISK)

**Issue**: Vite only loads `.env.production` when:
- `vite build --mode production` is used, OR
- `NODE_ENV=production` is set

**Current Build Scripts**:
- `pnpm build`: Runs `vite build` (default mode, may not load `.env.production`)
- `pnpm build:prod`: Runs `vite build --mode production` ✅ (correct)

**Risk**: 
- If someone runs `pnpm build` without `--mode production`, `.env.production` won't load
- Production builds might use `.env` (test keys) instead of `.env.production` (prod keys)

**Required Fix**:
- Ensure all production builds use `--mode production`
- Update `pnpm build` to default to production mode OR
- Add validation to fail if production build uses test keys

### 2. **Vercel Environment Variables** (MEDIUM RISK)

**Issue**: Vercel sets environment variables at build time, overriding `.env.production`

**Current State**: 
- Vercel Dashboard has environment variables
- These override file-based env vars during builds

**Risk**:
- If Vercel env vars are set incorrectly, file-based config is ignored
- Need to verify Vercel has correct production keys

**Required Fix**:
- Document Vercel env var precedence
- Add verification step for Vercel configuration
- Ensure Vercel uses production keys for production builds

### 3. **Runtime Validation Missing** (MEDIUM RISK)

**Issue**: Plan only validates at build time, not runtime

**Risk**:
- If wrong key is loaded, app fails at runtime (bad UX)
- No early detection of misconfiguration

**Required Fix**:
- Add runtime validation in `src/lib/env.ts`
- Warn if production key detected in development mode
- Warn if test key detected in production mode

### 4. **Edge Cases Not Addressed** (LOW-MEDIUM RISK)

**Missing Scenarios**:
- `.env.development.local` override (highest precedence)
- Preview/staging environments
- CI/CD builds (GitHub Actions, etc.)
- Local production builds (`pnpm build:prod`)

**Required Fix**:
- Document all Vite env file precedence
- Add guidance for preview/staging
- Document CI/CD key management

### 5. **Validation Script Scope** (LOW RISK)

**Issue**: Validation script is "optional" but should be required

**Risk**:
- Developers might skip validation
- Misconfigurations go undetected

**Required Fix**:
- Make validation script part of build process
- Add pre-commit hook or dev server startup check
- Fail fast on misconfiguration

---

## 🔧 Recommended Enhancements

### Enhancement 1: Strengthen Build Validation

**Current**: `scripts/validate-build-env.js` checks for test keys in production

**Enhancement**:
```javascript
// Add check for production keys in development
if (!isProduction && clerkKey?.startsWith('pk_live_')) {
  console.warn('');
  console.warn('⚠️  WARNING: Production Clerk key detected in development');
  console.warn('   Production keys are domain-restricted and won\'t work on localhost');
  console.warn('   Use test key (pk_test_...) for local development');
  console.warn('');
  // Don't fail, but warn strongly
}
```

### Enhancement 2: Add Runtime Validation

**Location**: `src/lib/env.ts`

**Enhancement**:
```typescript
// Add to validateEnvironment()
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
if (isDev && CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')) {
  warnings.push(
    'Production Clerk key detected in development. ' +
    'This will cause authentication failures on localhost. ' +
    'Use test key (pk_test_...) for local development.'
  );
}
```

### Enhancement 3: Document Vite Mode Behavior

**Add to plan**:
- Clear explanation of when `.env.production` loads
- Warning about `pnpm build` vs `pnpm build:prod`
- Guidance for CI/CD environments

### Enhancement 4: Add Development-Specific Validation

**Create**: `scripts/validate-dev-env.ts`

**Purpose**:
- Check for production keys in `.env` (dev file)
- Warn if test keys missing
- Provide clear error messages

---

## 📋 Updated Implementation Plan

### Phase 1: Fix Immediate Issue ✅
- Update `.env` with test key
- Verify `.env.production` has production key

### Phase 2: Add Safety Guards (NEW)
- Add runtime validation in `src/lib/env.ts`
- Enhance build validation script
- Create dev environment validation script

### Phase 3: Documentation (ENHANCED)
- Document Vite mode behavior
- Add Vercel env var precedence
- Document edge cases (preview, staging, CI/CD)
- Add troubleshooting for common mistakes

### Phase 4: Verification (ENHANCED)
- Test `pnpm dev` with test key
- Test `pnpm build:prod` with production key
- Verify Vercel configuration
- Test edge cases (`.env.development.local`, etc.)

---

## 🎯 Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Production build uses test keys | HIGH | MEDIUM | Enhance build validation |
| Vercel env vars override file config | MEDIUM | HIGH | Document and verify Vercel |
| Runtime failure from wrong key | MEDIUM | LOW | Add runtime validation |
| Developer confusion about modes | LOW | MEDIUM | Enhanced documentation |

---

## ✅ Approval Criteria

Before executing, ensure:

1. ✅ Build validation enhanced to catch production keys in dev
2. ✅ Runtime validation added to `src/lib/env.ts`
3. ✅ Documentation includes Vite mode behavior
4. ✅ Vercel configuration verified
5. ✅ Edge cases documented (preview, staging, CI/CD)

---

## 📝 Final Recommendation

**Status**: ✅ **APPROVE with enhancements**

The plan is architecturally sound but needs safety guards and documentation improvements. The core approach (`.env` for dev, `.env.production` for prod) is correct and follows Vite best practices.

**Priority Enhancements**:
1. Add runtime validation (prevents runtime failures)
2. Enhance build validation (catches misconfigurations early)
3. Document Vite mode behavior (prevents developer confusion)

**Execution Order**:
1. Fix immediate issue (update `.env`)
2. Add safety guards (validation)
3. Update documentation
4. Verify all scenarios

---

## Questions for Clarification

1. **Vercel Configuration**: Are Vercel env vars already set correctly for production?
2. **CI/CD**: Do you use GitHub Actions or other CI/CD? How are env vars managed there?
3. **Preview Environments**: Do you use Vercel preview deployments? What keys should they use?
4. **Team Size**: Will multiple developers need test keys, or is this single-developer?


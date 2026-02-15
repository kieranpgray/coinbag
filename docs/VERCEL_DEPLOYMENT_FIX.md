# Fix: Both Supafolio and Wellthy Deploying Simultaneously

## Problem Diagnosis

**Root Cause**: Both Vercel projects are linked to the same GitHub repository (`https://github.com/kieranpgray/supafolio.git`), causing both to deploy on every push.

**Current State**:
- ✅ Wellthy Vercel project: `prj_Qhd4BZeOwuskblQ1iaeKYtNwMUQt` (projectName: "wellthy")
- ⚠️ Supafolio Vercel project: (unknown project ID, but likely exists)
- 🔗 Both linked to: `https://github.com/kieranpgray/supafolio.git`

## Solutions

### Option 1: Configure Branch Filters (Recommended)

Configure each Vercel project to only deploy from specific branches:

**For Wellthy Project:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **wellthy** project
3. Go to **Settings** → **Git**
4. Under **Production Branch**, ensure it's set to `main` (or your desired branch)
5. Under **Ignored Build Step**, add:
   ```bash
   # Only deploy wellthy when this is the wellthy branch
   git diff HEAD^ HEAD --quiet ./
   ```
   Or use a more specific check:
   ```bash
   # Deploy only if package.json name is wellthy (after you update it)
   grep -q '"name": "wellthy"' package.json
   ```

**For Supafolio Project:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **supafolio** project
3. Go to **Settings** → **Git**
4. Under **Production Branch**, ensure it's set to `main` (or your desired branch)
5. Under **Ignored Build Step**, add:
   ```bash
   # Only deploy supafolio when package.json name is supafolio
   grep -q '"name": "supafolio"' package.json
   ```

### Option 2: Use Different Branches

If you want to keep them completely separate:

1. **Wellthy**: Deploy from `main` branch
2. **Supafolio**: Deploy from a different branch (e.g., `supafolio-main` or `supafolio-production`)

Configure in Vercel Dashboard → Settings → Git → Production Branch

### Option 3: Separate Repositories (Long-term Solution)

If these are truly separate projects:

1. Create a new GitHub repository for wellthy: `https://github.com/kieranpgray/wellthy.git`
2. Update the wellthy project's Git remote:
   ```bash
   cd /Users/kierangray/Projects/wellthy
   git remote set-url origin https://github.com/kieranpgray/wellthy.git
   git push -u origin main
   ```
3. In Vercel Dashboard, update the wellthy project to point to the new repository

### Option 4: Monorepo Configuration

If you want to keep them in the same repo (monorepo setup):

1. Use Vercel's **Root Directory** setting:
   - Wellthy: Root Directory = `/` (or current structure)
   - Supafolio: Root Directory = `/supafolio` (if you move it to a subdirectory)

2. Or use **Ignore Build Step** with path checking:
   ```bash
   # For wellthy - only build if wellthy files changed
   git diff HEAD^ HEAD --quiet -- supafolio/ || exit 1
   ```

## Immediate Fix: Update package.json

First, let's fix the package.json name mismatch:

```bash
# Update package.json to reflect wellthy project name
# This will help with ignore build step logic
```

## Verification Steps

After applying a solution:

1. Make a test commit to the repository
2. Check Vercel Dashboard → Deployments
3. Verify only the intended project deploys
4. Check deployment logs to confirm the correct project built

## Recommended Action Plan

1. ✅ **Update package.json** name to "supafolio" for the deploying project (wellthy project should skip via Ignored Build Step)
2. ✅ **Configure Ignore Build Step** in both Vercel projects using package.json name check
3. ✅ **Test** with a small commit
4. ✅ **Monitor** deployments to ensure only one project deploys per push

## Current Configuration Files

- **Vercel Project ID**: `prj_Qhd4BZeOwuskblQ1iaeKYtNwMUQt`
- **Project Name**: `wellthy`
- **Git Remote**: `https://github.com/kieranpgray/supafolio.git`
- **Package Name**: `supafolio`


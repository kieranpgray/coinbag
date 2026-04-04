# Disable Wellthy Deployments - Only Supafolio Deploys

## Goal
Configure Vercel so that **only supafolio** deploys when you push to the repository. The **wellthy** project must not run builds or deployments.

## Quick Fix (2 minutes)

### Step 1: Disable Wellthy Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find and select the **wellthy** project (not supafolio)
3. Go to **Settings** → **Git**
4. Scroll down to **"Ignored Build Step"**
5. Enter **one** of the following (recommended: use the script so the rule lives in the repo):

   **Option A – Recommended (repo-driven):**
   ```bash
   ./scripts/check-build.sh
   ```
   The script exits with code 1 when `VERCEL_PROJECT_NAME=wellthy`, so the build is skipped. No other projects are affected.

   **Option B – One-line (dashboard-only):**
   ```bash
   exit 1
   ```
   This always skips builds for the wellthy project.

6. Click **Save**

This ensures the wellthy project **never** runs a build or deployment.

### Step 2: Verify Supafolio is Active

1. In Vercel Dashboard, find the **supafolio** project
2. Go to **Settings** → **Git**
3. Ensure **"Ignored Build Step"** is **empty** or contains:
   ```bash
   grep -q '"name": "supafolio"' package.json
   ```
4. This ensures supafolio only deploys when `package.json` has `"name": "supafolio"` (which it does)

## How It Works

- **Wellthy**: Ignored Build Step runs first. With `./scripts/check-build.sh` or `exit 1`, the step fails → build is skipped → no deployment.
- **Supafolio**: Leave Ignored Build Step **empty** (or use `grep -q '"name": "supafolio"' package.json`) → build runs normally → deploys.

## Verification

After configuring:

1. Make a test commit:
   ```bash
   git commit --allow-empty -m "test: verify only supafolio deploys"
   git push
   ```

2. Check Vercel Dashboard → Deployments:
   - ✅ Supafolio should show a new deployment
   - ❌ Wellthy should show "Build Skipped" or no new deployment

## Alternative: Unlink Wellthy Project

If you want to completely remove the wellthy project from this repository:

1. Go to Vercel Dashboard → **wellthy** project
2. Go to **Settings** → **Git**
3. Click **"Disconnect Git Repository"**
4. Confirm the disconnection

This completely removes the wellthy project from watching this repository.

## Current Configuration

- **Package.json name**: `supafolio` ✅
- **Git Remote**: `https://github.com/kieranpgray/supafolio.git`
- **Wellthy Project ID**: `prj_Qhd4BZeOwuskblQ1iaeKYtNwMUQt`
- **Wellthy Project Name**: `wellthy`

## Troubleshooting

### Both still deploy
- Double-check the "Ignored Build Step" was saved in wellthy project
- Verify you're looking at the correct project in Vercel Dashboard
- Check that supafolio project doesn't also have an ignore step

### Supafolio doesn't deploy
- Ensure supafolio project's "Ignored Build Step" is empty or correctly configured
- Verify supafolio project is linked to the same repository
- Check supafolio project's Git settings are correct


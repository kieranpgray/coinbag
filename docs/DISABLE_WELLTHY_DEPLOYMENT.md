# Disable Wellthy Deployments - Only Coinbag Deploys

## Goal
Configure Vercel so that **only coinbag** deploys when you push to the repository. The wellthy project should be disabled.

## Quick Fix (2 minutes)

### Step 1: Disable Wellthy Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find and select the **wellthy** project
3. Go to **Settings** → **Git**
4. Scroll down to **"Ignored Build Step"**
5. Enter this command:
   ```bash
   exit 1
   ```
6. Click **Save**

This makes the wellthy project **always skip builds**, so it will never deploy.

### Step 2: Verify Coinbag is Active

1. In Vercel Dashboard, find the **coinbag** project
2. Go to **Settings** → **Git**
3. Ensure **"Ignored Build Step"** is **empty** or contains:
   ```bash
   grep -q '"name": "coinbag"' package.json
   ```
4. This ensures coinbag only deploys when `package.json` has `"name": "coinbag"` (which it does)

## How It Works

- **Wellthy**: `exit 1` always fails → build is skipped → no deployment
- **Coinbag**: No ignore step (or checks for "coinbag" name) → builds normally → deploys

## Verification

After configuring:

1. Make a test commit:
   ```bash
   git commit --allow-empty -m "test: verify only coinbag deploys"
   git push
   ```

2. Check Vercel Dashboard → Deployments:
   - ✅ Coinbag should show a new deployment
   - ❌ Wellthy should show "Build Skipped" or no new deployment

## Alternative: Unlink Wellthy Project

If you want to completely remove the wellthy project from this repository:

1. Go to Vercel Dashboard → **wellthy** project
2. Go to **Settings** → **Git**
3. Click **"Disconnect Git Repository"**
4. Confirm the disconnection

This completely removes the wellthy project from watching this repository.

## Current Configuration

- **Package.json name**: `coinbag` ✅
- **Git Remote**: `https://github.com/kieranpgray/coinbag.git`
- **Wellthy Project ID**: `prj_Qhd4BZeOwuskblQ1iaeKYtNwMUQt`
- **Wellthy Project Name**: `wellthy`

## Troubleshooting

### Both still deploy
- Double-check the "Ignored Build Step" was saved in wellthy project
- Verify you're looking at the correct project in Vercel Dashboard
- Check that coinbag project doesn't also have an ignore step

### Coinbag doesn't deploy
- Ensure coinbag project's "Ignored Build Step" is empty or correctly configured
- Verify coinbag project is linked to the same repository
- Check coinbag project's Git settings are correct


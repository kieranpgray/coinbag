# Simple Fix: Only Coinbag Deploys

## ✅ Solution Implemented

I've created a build check script that will skip wellthy deployments. You just need to configure it **once** in the Vercel dashboard (takes 30 seconds).

## One-Time Setup (30 seconds)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **wellthy** project
3. Go to **Settings** → **Git**
4. Scroll to **"Ignored Build Step"**
5. Paste this command:
   ```bash
   ./scripts/check-build.sh
   ```
6. Click **Save**

That's it! Now wellthy will never deploy, only coinbag will.

## How It Works

1. **Vercel runs the script** before each build
2. The script checks `VERCEL_PROJECT_NAME` environment variable  
3. If project name is "wellthy", script exits with code 1 → build is skipped ❌
4. If project name is "coinbag", script exits with code 0 → build proceeds ✅

## Files Created

- ✅ `scripts/check-build.sh` - Script that checks project name and skips wellthy builds
- ✅ This script is version controlled and will work for your team

## Why This Approach?

- ✅ **File-based** - Script is in your repo, version controlled
- ✅ **One-time setup** - Just paste the command in dashboard once
- ✅ **No CLI needed** - No terminal commands required
- ✅ **Automatic** - Works on every push after setup

## Verification

After your next push:

1. Check Vercel Dashboard → Deployments
2. Wellthy project should show "Build Skipped" or no new deployment
3. Coinbag project should deploy normally

## How to Test

Make a test commit:
```bash
git add package.json scripts/check-build.sh
git commit -m "fix: disable wellthy deployments, only coinbag deploys"
git push
```

Then check Vercel Dashboard to confirm only coinbag deployed.

## Reverting (If Needed)

If you want wellthy to deploy again, simply remove the `ignore` script from `package.json`:

```json
// Remove this line:
"ignore": "./scripts/check-build.sh"
```


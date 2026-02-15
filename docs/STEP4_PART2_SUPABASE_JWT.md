# Step 4 Part 2: Configure Supabase JWT Validation

## Overview

Now that the Clerk JWT template is created, we need to configure Supabase to validate tokens from Clerk.

## Configuration Values

- **JWKS URL**: `https://clerk.supafolio.app/.well-known/jwks.json`
- **Issuer**: `https://clerk.supafolio.app`
- **Audience**: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`

## Step-by-Step Configuration

### Step 1: Navigate to Supabase Authentication Settings

1. Go to [Supabase Dashboard](https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx)
2. Click **Authentication** in the left sidebar
3. Click **Settings** (or look for **URL Configuration** or **JWT Settings**)

### Step 2: Configure JWT Validation

Look for one of these sections:

**Option A: "Third-Party Auth" or "External OAuth Providers"**
- If you see this option, it's the preferred method
- Click **"Add provider"** or **"Configure Clerk"**
- Enter your Clerk domain: `clerk.supafolio.app`
- Save

**Option B: "JWT Settings" or "JWKS URL" Configuration**
- If Option A is not available, use this method
- Find **"JWKS URL"** field
- Enter: `https://clerk.supafolio.app/.well-known/jwks.json`
- Find **"Issuer"** field
- Enter: `https://clerk.supafolio.app`
- Find **"Audience"** field
- Enter: `ins_37VAGQw0JVza01qpTa6yUt8iVLY`
- Enable **"JWT Verification"** toggle (if present)
- Click **"Save"**

### Step 3: Wait for Propagation

After saving, wait **2-5 minutes** for the configuration to propagate across Supabase's infrastructure.

## Verification

After waiting, proceed to Step 5 to verify the configuration works.


# Clerk JWT Template Setup - Quick Start

## 🎯 What You Need

1. **Supabase JWT Secret** - From Supabase Dashboard → Project Settings → API → JWT Secret
2. **Clerk Domain** - From Clerk Dashboard → Settings → Domains
3. **Clerk Application ID** - From Clerk Dashboard → API Keys

---

## 📋 Step-by-Step (5 minutes)

### 1️⃣ Get Supabase JWT Secret
- Go to: https://app.supabase.com → Your Project → Project Settings → API
- Copy **"JWT Secret"** (long string)

### 2️⃣ Get Clerk Info
- Go to: https://dashboard.clerk.com → Your App
- **Domain**: Settings → Domains → Copy domain (e.g., `clerk.supafolio.app`)
- **Application ID**: API Keys → Copy Application ID (e.g., `ins_xxxxx`)

### 3️⃣ Create Clerk JWT Template
- Go to: Clerk Dashboard → **JWT Templates** → **New template**

**Template Configuration**:
- **Name**: `supabase` (exactly, lowercase)
- **Algorithm**: `HS256`
- **Signing Key**: Paste Supabase JWT Secret from step 1
- **Lifetime**: `3600` seconds

**Claims** (add these):
```json
{
  "sub": "{{user.id}}",
  "role": "authenticated",
  "aud": "<paste-your-application-id-here>",
  "iss": "https://<paste-your-clerk-domain-here>",
  "exp": "{{date.now_plus_seconds(3600)}}",
  "iat": "{{date.now}}"
}
```

⚠️ **Critical**: `role` must be exactly `"authenticated"` (string, with quotes, not a variable)

Click **Save**

### 4️⃣ Configure Supabase

**Option A: Third-Party Auth** (if available)
- Supabase Dashboard → Authentication → Providers
- Add Clerk provider
- Enter your Clerk domain

**Option B: JWKS URL** (if Option A not available)
- Supabase Dashboard → Authentication → Settings
- **JWKS URL**: `https://<your-clerk-domain>/.well-known/jwks.json`
- **Issuer**: `https://<your-clerk-domain>`
- **Audience**: Your Clerk Application ID
- Enable JWT verification
- Save

### 5️⃣ Test It

**In Browser Console** (while signed in):
```javascript
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Token:', payload);
      console.log('Role:', payload.role); // Should be "authenticated"
      console.log('User ID:', payload.sub); // Should be your Clerk user ID
    }
  });
```

**Expected**: Should see token with `role: "authenticated"` and `sub: "user_xxxxx"`

---

## ✅ Verification Checklist

- [ ] Template created in Clerk named "supabase"
- [ ] Template uses HS256 algorithm
- [ ] Template has `role: "authenticated"` claim (exact string)
- [ ] Template has `sub: {{user.id}}` claim
- [ ] Supabase configured (either Third-Party Auth or JWKS URL)
- [ ] Browser console test shows token with correct claims
- [ ] Statement upload works (no RLS errors)

---

## 🐛 Common Issues

**"Template not found"**
→ Check template name is exactly `supabase` (lowercase)

**`auth.jwt()` returns NULL**
→ Wait 2-5 minutes after configuring Supabase, then try again

**Role claim missing**
→ In Clerk template, ensure `role` is `"authenticated"` (with quotes, not a variable)

**Storage upload still fails**
→ Clear browser cache, sign out/in, try again

---

## 📚 Full Documentation

See `docs/CLERK_JWT_TEMPLATE_SETUP_COMPLETE.md` for detailed instructions and troubleshooting.


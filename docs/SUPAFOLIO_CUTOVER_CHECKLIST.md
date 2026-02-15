# Supafolio cutover checklist

Use this when cutting over from Coinbag to Supafolio (app and code are already renamed). Order matters: Clerk first, then env, then deploy.

---

## 1. Clerk — Supafolio application and domain

1. Go to [Clerk Dashboard](https://dashboard.clerk.com).
2. Either:
   - **Option A:** Create a new application named "Supafolio", or  
   - **Option B:** Rename/repurpose the existing application to Supafolio.
3. Add your production domain:
   - **Settings → Domains**: add `clerk.supafolio.app` (Clerk’s default for your instance) or your custom domain (e.g. `auth.supafolio.app`).
4. Note your **Clerk domain** (e.g. `clerk.supafolio.app`) and ensure **JWKS URL** is reachable:  
   `https://<your-clerk-domain>/.well-known/jwks.json`

---

## 2. Supabase — JWT for Supafolio Clerk

1. Go to [Supabase Dashboard](https://app.supabase.com) → your **Supafolio** project (e.g. `auvtsvmtfrbpvgyvfqlx`).
2. **Settings → API → JWT Settings** (or **Authentication → JWT**).
3. Set **JWT Secret** / **JWT Template** so that:
   - **JWKS URL**: `https://<your-clerk-domain>/.well-known/jwks.json` (e.g. `https://clerk.supafolio.app/.well-known/jwks.json`)
   - **Issuer**: `https://<your-clerk-domain>` (e.g. `https://clerk.supafolio.app`)
4. Save. Existing RLS and API keys are unchanged.

---

## 3. Local environment

1. In the project root, update `.env` and `.env.production` (if you use them):
   ```bash
   CLERK_DOMAIN=clerk.supafolio.app
   ```
   (Use your actual Clerk domain if different.)
2. Ensure `VITE_CLERK_PUBLISHABLE_KEY` is the **production** key from the Supafolio Clerk application (e.g. `pk_live_...`).
3. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing at your Supafolio Supabase project.
4. Run the app locally and sign in once to confirm auth works with the new Clerk domain.

---

## 4. Vercel — project and env

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Either:
   - **Rename** the existing project from "coinbag" to "supafolio", or  
   - **Create** a new project named "supafolio" and link it to the same Git repo (then you can remove or disable the old "coinbag" project).
3. **Settings → Environment Variables** for the **supafolio** project:
   - Set `CLERK_DOMAIN` = `clerk.supafolio.app` (or your Clerk domain).
   - Set `VITE_CLERK_PUBLISHABLE_KEY` = your production publishable key.
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the Supafolio Supabase project.
   - Set `VITE_DATA_SOURCE=supabase` for production.
4. **Ignored Build Step**: leave empty or use `./scripts/check-build.sh`. Do **not** require `"name": "coinbag"`; the app is now `"name": "supafolio"`.
5. Trigger a new deployment (push to main or **Redeploy** in Vercel).

---

## 5. Production domain (e.g. supafolio.app)

1. In your DNS provider, add a CNAME (or A record) for your app domain (e.g. `supafolio.app` or `www.supafolio.app`) pointing to Vercel (e.g. `cname.vercel-dns.com` or the value Vercel shows).
2. In **Vercel → Project → Settings → Domains**, add the domain (e.g. `supafolio.app`).
3. In **Clerk → Settings → Domains**, ensure your app domain is allowed for production (e.g. `supafolio.app`).
4. After DNS propagates, open `https://<your-domain>` and test sign-in and a few key flows.

---

## 6. (Optional) Remove old Clerk domain from CSP

After you’ve confirmed production works **only** with `clerk.supafolio.app`:

1. In `vercel.json`, edit the **Content-Security-Policy** header value.
2. Remove `https://clerk.coinbag.app` from `script-src`, `connect-src`, and `frame-src` (leave `https://clerk.supafolio.app`).
3. Commit, push, and redeploy.

---

## 7. (Optional) GitHub repo name

1. On GitHub: **Settings → General → Repository name** → change to `supafolio` (or desired name).
2. Locally, update the remote if the URL changed:
   ```bash
   git remote set-url origin https://github.com/<owner>/supafolio.git
   ```
3. Anyone else cloning will get a folder named `supafolio`; README already explains that the folder name matches the repo.

---

## Quick verification

- [ ] Clerk: Supafolio app has production domain; JWKS URL loads in browser.
- [ ] Supabase: JWT/JWKS and Issuer point at Supafolio Clerk domain.
- [ ] Local: `.env` has `CLERK_DOMAIN=clerk.supafolio.app`; sign-in works.
- [ ] Vercel: `CLERK_DOMAIN` and other env vars set; latest deploy succeeds.
- [ ] Production: Open app URL, sign in, check one or two authenticated flows.

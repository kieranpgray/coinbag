# Workspace migration: step-by-step plan

Apply the workspace migration to each Supabase project so the app (Transfers, workspace switcher, etc.) works without 500/400 errors.

| Project        | Role        | URL |
|----------------|-------------|-----|
| **supafolio-dev** (dev) | `tislabgxitwtcqfwrpik` | https://tislabgxitwtcqfwrpik.supabase.co |
| **supafolio** (production) | `auvtsvmtfrbpvgyvfqlx` | https://auvtsvmtfrbpvgyvfqlx.supabase.co |

**Recommendation:** Run **dev first**, confirm the app works, then run **production**.

---

## Prerequisites (both projects)

- **Tables:** `categories`, `goals`, `user_preferences` must exist (from earlier migrations). If they don’t, run your base migrations first.
- **Function:** `update_updated_at_column()` must exist (from an earlier migration). If you get “function does not exist”, run the migration that creates it first.
- **Script used:** `scripts/production-workspace-migration.sql` (idempotent: safe to re-run; drops policies/triggers before recreating).

---

## Option A: Supabase Dashboard (recommended)

No DB password or `psql` needed. Same steps for dev and production; only the project (and SQL Editor URL) changes.

### Step 1: Apply to **dev** (supafolio-dev)

1. Open the **SQL Editor** for the **dev** project:
   - **URL:** https://app.supabase.com/project/tislabgxitwtcqfwrpik/sql/new
2. Open **`scripts/production-workspace-migration.sql`** in your repo and copy the **entire** file.
3. Paste into the SQL Editor and click **Run** (or Cmd/Ctrl+Enter).
4. Expect: **“Success. No rows returned”** (or similar).  
   If you see errors:
   - **“policy already exists”** / **“trigger already exists”** → Script may be from before the idempotent update. Re-copy the current `scripts/production-workspace-migration.sql` and run again.
   - **“relation … does not exist”** (e.g. `categories`) → Run the migrations that create `categories`, `goals`, `user_preferences` first.
   - **“function update_updated_at_column() does not exist”** → Run the migration that creates that function first.
5. **Verify dev:**
   - In the same project’s SQL Editor, run:
     ```sql
     SELECT 'workspaces' AS tbl, COUNT(*) AS cnt FROM workspaces
     UNION ALL SELECT 'workspace_memberships', COUNT(*) FROM workspace_memberships
     UNION ALL SELECT 'workspace_invitations', COUNT(*) FROM workspace_invitations;
     ```
   - You should get three rows with counts (0 or more). No “relation does not exist”.
   - In the app with **dev** env (e.g. `.env` → `VITE_SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co`), open **Transfers**. You should no longer see 500 on `workspace_memberships` or 400 on `accounts` (assuming accounts table has the expected columns).

### Step 2: Apply to **production** (supafolio)

1. Open the **SQL Editor** for the **production** project:
   - **URL:** https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/sql/new
2. Copy the **entire** `scripts/production-workspace-migration.sql` again and paste into the SQL Editor.
3. Click **Run**.
4. Expect: **“Success. No rows returned”**.  
   If you see the same error types as in Step 1, resolve them the same way (missing tables/functions first, then re-run the workspace script).
5. **Verify production:**
   - In production SQL Editor, run the same verification query as in Step 1 (workspaces / workspace_memberships / workspace_invitations counts).
   - Use the app with **production** env (e.g. Vercel or `.env.production` → `VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co`) and open **Transfers** again. 500/400 from workspace and accounts should be gone (if production `accounts` has the required columns).

### Step 3: Optional – run the workspace check script

In either project’s SQL Editor you can run **`scripts/check-workspace-migration.sql`** (full file). It checks tables, enum, constraints, RLS, and indexes. “PASS” messages mean the workspace migration is in good shape.

---

## Option B: CLI / psql (optional)

If you prefer to use the **individual** migration files (and have the DB password and `psql`), use the existing script and point it at each project.

### Dev (supafolio-dev)

```bash
# From repo root
export SUPABASE_DB_PASSWORD='<dev-database-password>'
export PROJECT_REF=tislabgxitwtcqfwrpik   # optional; this is the script default
./scripts/apply-workspace-migrations.sh
```

- Dev password: Supabase Dashboard → **supafolio-dev** → **Settings** → **Database** → Database password.
- The script runs, in order:
  - `supabase/migrations/20260226000000_create_workspaces_schema.sql`
  - `supabase/migrations/20260226120000_workspace_context_domain_tables.sql`
  - `supabase/migrations/20260226180000_workspace_invite_accept_function.sql`

### Production (supafolio)

```bash
export SUPABASE_DB_PASSWORD='<production-database-password>'
export PROJECT_REF=auvtsvmtfrbpvgyvfqlx
./scripts/apply-workspace-migrations.sh
```

- Production password: Supabase Dashboard → **supafolio** (production) → **Settings** → **Database** → Database password.

**Note:** This path does **not** use the combined idempotent script. If production has already had part of the workspace migration applied (e.g. policies created), the **Dashboard + `scripts/production-workspace-migration.sql`** (Option A) is safer for production.

---

## Summary table

| Step | Project   | Action |
|------|-----------|--------|
| 1    | **Dev** (tislabgxitwtcqfwrpik) | Open dev SQL Editor → paste full `scripts/production-workspace-migration.sql` → Run → verify with count query and app (Transfers). |
| 2    | **Production** (auvtsvmtfrbpvgyvfqlx) | Open prod SQL Editor → paste full `scripts/production-workspace-migration.sql` → Run → verify with count query and app (Transfers). |
| 3    | Optional | Run `scripts/check-workspace-migration.sql` in SQL Editor for either project. |

**Do you need to update both?**  
- **Dev only:** Yes, if you only use the dev project (e.g. local with `VITE_SUPABASE_URL` pointing at dev). Then Step 1 is enough.  
- **Production only:** If the app is already on production and you only care about fixing prod, you can do Step 2 only (still recommended to test on dev first).  
- **Both:** Do Step 1 then Step 2 so dev and production stay in sync and you avoid surprises in production.

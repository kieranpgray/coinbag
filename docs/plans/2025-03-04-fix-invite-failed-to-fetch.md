# Fix Invite "Failed to Fetch" – Implementation Plan

## Execution status (2025-03-04)

| Task | Status | Notes |
|------|--------|-------|
| **Task 1** (RLS migration on linked project) | **Requires you** | `supabase link` prompts for DB password (interactive). Run: `npx supabase link --project-ref tislabgxitwtcqfwrpik` then `npx supabase db push`. If push fails, run the migration SQL manually in Dashboard > SQL Editor (see [supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql](../supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql)). |
| **Task 2** (Deploy Edge Function) | **Done** | `workspace-invites` deployed to project `tislabgxitwtcqfwrpik`. OPTIONS returns 200 with CORS headers. |
| **Task 2** (Secrets) | **Requires you** | Set Clerk secret so create-invite works: `npx supabase secrets set CLERK_SECRET_KEY=<your-clerk-secret> --project-ref tislabgxitwtcqfwrpik`. Get the key from Clerk Dashboard > API Keys (secret key). |
| **Task 3** (E2E verification) | **Requires you** | After Task 1 and CLERK_SECRET_KEY: open app > Settings > Team, add an invite; expect no "failed to fetch" and success or clear API error. |

---

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** User can add a workspace invite without "failed to fetch"; Settings > Team and invite creation work against the linked Supabase project (tislabgxitwtcqfwrpik.supabase.co).

**Architecture:** (1) Apply the RLS recursion fix migration on the **linked/hosted** Supabase project so `workspace_memberships` and dependent tables (e.g. `categories`) stop returning 500. (2) Deploy the `workspace-invites` Edge Function to that project and set required secrets so OPTIONS and POST return 200/2xx and the browser does not block on CORS.

**Tech Stack:** Supabase (migrations, Edge Functions, secrets), Clerk JWT, fetch from [src/lib/workspaceInvitesApi.ts](../src/lib/workspaceInvitesApi.ts).

**Prerequisites:** Supabase CLI installed and logged in. Check with `npx supabase --version` and `npx supabase login` if needed.

---

## Root cause (from your logs)

- **500 on** `workspace_memberships` and **categories**: Suggests the migration [supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql](../supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql) is not applied on the **hosted** project you are hitting (`tislabgxitwtcqfwrpik.supabase.co`). You may have run it only locally.
- **CORS / "Response to preflight request doesn't pass access control check: It does not have HTTP ok status"**: The preflight (OPTIONS) to `/functions/v1/workspace-invites` is getting a non-200 (likely 404 = function not deployed, or 500 = function crash). So the invite POST never runs or is blocked.

---

### Task 1: Apply RLS recursion fix migration on the linked project

**Goal:** Ensure [20260304120000_fix_workspace_memberships_rls_recursion.sql](../supabase/migrations/20260304120000_fix_workspace_memberships_rls_recursion.sql) is applied on the same Supabase project the app uses (so 500s on `workspace_memberships` and categories stop).

**Where to get project ref:** From `VITE_SUPABASE_URL` in `.env` (hostname before `.supabase.co`, e.g. `tislabgxitwtcqfwrpik`) or Supabase Dashboard > Project Settings.

**Steps:**

1. Confirm which project the app uses: check `VITE_SUPABASE_URL` in `.env` and note the project ref.
2. Confirm the app and CLI target the same project: after linking, `VITE_SUPABASE_URL` should match the linked project (e.g. compare with Supabase Dashboard URL or `npx supabase projects list`).
3. Link the CLI to that project if needed: `npx supabase link --project-ref <ref>`. Have the database password ready if prompted (Dashboard > Project Settings > Database).
4. Push migrations to the linked project:
   `npx supabase db push`
   Expected: Migrations applied (including `20260304120000_fix_workspace_memberships_rls_recursion`). If it says "already applied", you are done for this task.
   **If `db push` fails** (e.g. migration conflict, CLI not linked): run the migration SQL manually in Supabase Dashboard > SQL Editor (paste contents of the migration file).
5. Verify: In Supabase Dashboard > SQL Editor, run
   `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_workspace_ids_for_current_user';`
   Expected: One row. Then open the app, go to Settings > Team; expect no 500s and team list/empty state to load.

**Rollback:** Supabase has no one-click migration revert. To roll back: in SQL Editor, drop the new policies and recreate the originals from [20260226000000_create_workspaces_schema.sql](../supabase/migrations/20260226000000_create_workspaces_schema.sql) (RLS section), drop the helper functions, and restore `get_default_workspace_id_for_user` from [20260226120000_workspace_context_domain_tables.sql](../supabase/migrations/20260226120000_workspace_context_domain_tables.sql). Or restore from a backup.

---

### Task 2: Deploy workspace-invites Edge Function and set secrets

**Goal:** Deploy the function so OPTIONS and POST to `/functions/v1/workspace-invites` return 200/2xx and CORS passes.

**Files:**

- Deploy: [supabase/functions/workspace-invites/index.ts](../supabase/functions/workspace-invites/index.ts) (already handles OPTIONS with CORS at lines 259–261).
- Env: Function needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLERK_SECRET_KEY` (see [supabase/functions/workspace-invites/README.md](../supabase/functions/workspace-invites/README.md)).

**Where to get secrets:** Project ref as in Task 1. `CLERK_SECRET_KEY` from Clerk Dashboard > API Keys (secret key). Supabase usually injects `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Edge Functions; if your project does not (function logs show missing env), set them: `npx supabase secrets set SUPABASE_URL=<url> SUPABASE_ANON_KEY=<anon-key> --project-ref <ref>`.

**Steps:**

1. Log in and link (if not done): `npx supabase login`, `npx supabase link --project-ref <ref>`
2. Set secrets for the function: `npx supabase secrets set CLERK_SECRET_KEY=<clerk-secret-key> --project-ref tislabgxitwtcqfwrpik` (use Clerk secret key from Clerk Dashboard, not the anon/publishable key).
3. Deploy the function: `npx supabase functions deploy workspace-invites --project-ref tislabgxitwtcqfwrpik`. Expected: Deployment success and URL shown.
4. Verify preflight: `curl -i -X OPTIONS 'https://tislabgxitwtcqfwrpik.supabase.co/functions/v1/workspace-invites' -H 'Origin: https://localhost:5173'`. Expected: HTTP 200 and headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`.

**If OPTIONS still returns 4xx/5xx:** Check Dashboard > Edge Functions > workspace-invites logs for errors (e.g. missing env). Ensure the function is deployed to the same project as the app's `VITE_SUPABASE_URL`.

---

### Task 3: End-to-end verification (invite create)

**Acceptance criteria:**

- No "failed to fetch"; no CORS error in console.
- On success: invite created or resend confirmed.
- On 4xx from API: user sees the API error message (e.g. "Already a member", "Forbidden: must be workspace admin") in the UI, not a generic "Failed to create invite" ([workspaceInvitesApi.ts](../src/lib/workspaceInvitesApi.ts) throws `data.error`; confirm the Team UI displays it).

**Steps:**

1. Open the app at `https://localhost:5173` (or your dev URL), go to Settings > Team.
2. Enter an email and role, click Invite.
3. Expected: No "failed to fetch"; either success message or the specific API error. No CORS error in console.
4. In Network tab: POST to `.../functions/v1/workspace-invites` returns 200 (or 4xx with JSON body). OPTIONS returns 200.
5. **Post-deploy check:** In Supabase Dashboard > Logs, confirm no 500s on `workspace_memberships` or Edge Function errors for workspace-invites.

---

### Optional: Radix Dialog accessibility (separate PR)

Console warnings: `DialogContent` requires a `DialogTitle` and optionally `Description` (or `aria-describedby`) for screen readers. Locate the Dialog used on the Team/settings invite UI and add a visible or `VisuallyHidden` `DialogTitle` and, if needed, `DialogDescription`. This does not fix the "failed to fetch" and can be done after Tasks 1–3.

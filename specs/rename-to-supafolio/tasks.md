# Tasks: Rename to Supafolio

From plan: [rename_to_supafolio_5cffa2ad.plan.md](.cursor/plans/rename_to_supafolio_5cffa2ad.plan.md). All references to "Coinbag" and "wellthy" in code, UI, and config become "Supafolio" (folder name stays `wellthy`).

## Critical Path

Task 1 → Task 2 → Task 3 → Task 4 (Phase 1 app code). Task 5 → Task 6 (Phase 2 storage). Task 7 (Phase 3 tests, depends on 1–6). Then Task 8–12 (scripts/CSP) and Task 13–16 (env/docs) can run in parallel. Task 17 (grep validation) depends on 13–16 and is last.

---

## App code and static config (Phase 1)

### Task 1: Rename package, HTML title, and domain comment

- **Depends on:** none
- **Creates/modifies:** `package.json`, `index.html`, `src/types/domain.ts`
- **Acceptance criteria:**
  - [ ] `package.json` has `"name": "supafolio"`
  - [ ] `index.html` has `<title>Supafolio</title>`
  - [ ] `src/types/domain.ts` comment says "Domain types for Supafolio application"
  - [ ] `pnpm build` succeeds
- **Notes:** No behaviour change; identity only.
- **Human input needed:** none

### Task 2: Rename layout branding (Header, Sidebar, MobileNav)

- **Depends on:** none
- **Creates/modifies:** `src/components/layout/Header.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNav.tsx`
- **Acceptance criteria:**
  - [ ] All three components show "Supafolio" where they currently show "Coinbag"
  - [ ] No "Coinbag" in these files
  - [ ] Build passes
- **Notes:** Exact string replace `Coinbag` → `Supafolio`.
- **Human input needed:** none

### Task 3: Rename auth and dashboard empty-state copy

- **Depends on:** none
- **Creates/modifies:** `src/pages/auth/SignInPage.tsx`, `src/pages/auth/SignUpPage.tsx`, `src/features/dashboard/components/CardBasedFlow.tsx`
- **Acceptance criteria:**
  - [ ] SignInPage: "Welcome to Supafolio"
  - [ ] SignUpPage: "Join Supafolio"
  - [ ] CardBasedFlow: "Welcome to Supafolio"
  - [ ] No "Coinbag" in these files
  - [ ] Build passes
- **Notes:** Replace full phrases, not just "Coinbag".
- **Human input needed:** none

### Task 4: Rename landing and import copy

- **Depends on:** none
- **Creates/modifies:** `src/components/landing/LandingNav.tsx`, `src/components/landing/CTASection.tsx`, `src/components/landing/FeaturesSection.tsx`, `src/features/import/ImportPage.tsx`, `src/lib/excel/templateGenerator.ts`
- **Acceptance criteria:**
  - [ ] LandingNav, CTASection, FeaturesSection: all "Coinbag" in comments and body copy → "Supafolio"
  - [ ] ImportPage: download filename is `supafolio-import-template.xlsx`
  - [ ] templateGenerator: sheet title is "Supafolio Import Template - Instructions"
  - [ ] `rg -i coinbag src index.html package.json` returns no matches
  - [ ] Build passes
- **Notes:** Context-aware replace in CTASection/FeaturesSection (multiple occurrences). Phase 1 acceptance: no coinbag in app code after this task.
- **Human input needed:** none

---

## Storage keys and globals (Phase 2)

### Task 5: Rename Supabase auth and view-preference keys

- **Depends on:** none
- **Creates/modifies:** `src/lib/supabase/supabaseBrowserClient.ts`, `src/hooks/useViewMode.ts`
- **Acceptance criteria:**
  - [ ] supabaseBrowserClient: `storageKey: "supafolio-auth"`; all `__wellthy_supabase_singleton__` → `__supafolio_supabase_singleton__`
  - [ ] useViewMode: `'supafolio-view-preference'`
  - [ ] No `wellthy` in these files
  - [ ] Build passes
- **Notes:** Optional: one-off migration in supabase client (copy `wellthy-auth` → `supafolio-auth`, delete old) to avoid one-time logout. Not required for MVP.
- **Human input needed:** none

### Task 6: Rename landing hero and mock storage keys

- **Depends on:** none
- **Creates/modifies:** `src/pages/landing/LandingPage.tsx`, `src/data/assets/mockRepo.ts`, `src/data/netWorthHistory/mockRepo.ts`
- **Acceptance criteria:**
  - [ ] LandingPage: `'supafolio_last_hero_variant'`
  - [ ] assets/mockRepo: `__supafolio_mock_assets__`
  - [ ] netWorthHistory/mockRepo: `__supafolio_mock_net_worth_history__`
  - [ ] No `__coinbag_` or `coinbag_last_` in src
  - [ ] Build passes
- **Notes:** LandingPage is only changed here for the hero storage key constant; no UI copy in that file for this rename.
- **Human input needed:** none

---

## Tests (Phase 3)

### Task 7: Update tests for Supafolio branding and storage keys

- **Depends on:** 1, 2, 3, 4, 5, 6
- **Creates/modifies:** `src/__tests__/smoke.test.tsx`, `src/features/dashboard/__tests__/DashboardEmptyState.test.tsx`, `src/features/assets/__tests__/P0AddInvestmentFlow.test.tsx`
- **Acceptance criteria:**
  - [ ] smoke.test: branding test asserts "Supafolio" (copy and `getAllByText` expectation)
  - [ ] DashboardEmptyState.test: expects "Welcome to Supafolio"
  - [ ] P0AddInvestmentFlow.test: `GLOBAL_STORAGE_KEY = '__supafolio_mock_assets__'` (matches mockRepo)
  - [ ] `pnpm test` (or `vitest --run`) passes
- **Notes:** Run tests after Phase 1 and 2 are done so assertions match current code.
- **Human input needed:** none

---

## Scripts and build/deploy config (Phase 4)

### Task 8: Update check-build.sh comments and messages only

- **Depends on:** none
- **Creates/modifies:** `scripts/check-build.sh`
- **Acceptance criteria:**
  - [ ] Logic unchanged: exit 1 only when `VERCEL_PROJECT_NAME=wellthy`; otherwise exit 0 (do not add condition that allows only `supafolio`)
  - [ ] Comments and echo messages say "supafolio" instead of "coinbag" (e.g. "only allows supafolio to build", "Only supafolio should deploy")
  - [ ] `VERCEL_PROJECT_NAME=supafolio ./scripts/check-build.sh` exits 0; `VERCEL_PROJECT_NAME=coinbag ./scripts/check-build.sh` exits 0; `VERCEL_PROJECT_NAME=wellthy ./scripts/check-build.sh` exits 1
- **Notes:** Critical for deploy. Do not change branching logic.
- **Human input needed:** none

### Task 9: Update Vercel deployment scripts

- **Depends on:** none
- **Creates/modifies:** `scripts/disable-wellthy-deployment.sh`, `scripts/fix-vercel-deployment.sh`
- **Acceptance criteria:**
  - [ ] disable-wellthy-deployment.sh: comments/echo describe "supafolio" as deploying project; "wellthy" only where it refers to legacy project to skip
  - [ ] fix-vercel-deployment.sh: instructions use "supafolio" (and legacy "wellthy" where relevant)
  - [ ] No incorrect "coinbag" as the active product name
- **Notes:** Context-aware; step instructions must stay correct.
- **Human input needed:** none

### Task 10: Update Clerk verification scripts (default domain + env)

- **Depends on:** none
- **Creates/modifies:** `scripts/verify-jwt-config.ts`, `scripts/verify-jwt-config-complete.ts`, `scripts/verify-clerk-jwt-config.ts`, `scripts/test-production-setup-complete.ts`, `scripts/verify-complete-setup.ts`
- **Acceptance criteria:**
  - [ ] Default `CLERK_DOMAIN` / `clerk.coinbag.app` → `clerk.supafolio.app` in all five scripts
  - [ ] Scripts read from env when set (e.g. `process.env.CLERK_DOMAIN || 'clerk.supafolio.app'`)
  - [ ] No hardcoded `clerk.coinbag.app` as the only option
- **Notes:** Prefer env fallback so local overrides work.
- **Human input needed:** none

### Task 11: Update Supabase and env fix scripts

- **Depends on:** none
- **Creates/modifies:** `scripts/update-supabase-anon-key.sh`, `scripts/fix-env-config.sh`, `scripts/fix-production-config.sh`
- **Acceptance criteria:**
  - [ ] update-supabase-anon-key.sh: variable/comments `COINBAG_ANON_KEY` → `SUPAFOLIO_ANON_KEY` (or `SUPABASE_ANON_KEY`); echo says "supafolio" where it said "coinbag"
  - [ ] fix-env-config.sh, fix-production-config.sh: comments/messages "coinbag"/"moneybags" → "supafolio"
  - [ ] No literal "coinbag" project references in script output
- **Notes:** update-supabase-anon-key.sh may reference env var name; keep script behaviour the same.
- **Human input needed:** none

### Task 12: Add both Clerk domains to vercel.json CSP

- **Depends on:** none
- **Creates/modifies:** `vercel.json`
- **Acceptance criteria:**
  - [ ] CSP `script-src`, `connect-src`, and `frame-src` each include both `https://clerk.coinbag.app` and `https://clerk.supafolio.app`
  - [ ] Do not remove the old domain; add the new one so production keeps working until Clerk cutover
- **Notes:** Single JSON line; copy the CSP value to a temp place, edit, then replace. Escaping is fragile.
- **Human input needed:** none

---

## Environment and documentation (Phase 5)

### Task 13: Add or update .env.example for Supafolio

- **Depends on:** none
- **Creates/modifies:** `.env.example` (create if missing), or README / docs if .env.example is not used
- **Acceptance criteria:**
  - [ ] If .env.example exists: `CLERK_DOMAIN=clerk.supafolio.app`; include at least `CLERK_DOMAIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see docs/CLERK_SETUP.md, docs/SUPABASE_SETUP.md for full list)
  - [ ] If .env.example does not exist: create it with those vars, or document in README that required vars are in those docs
- **Notes:** Do not commit .env or .env.production; document that user must set `CLERK_DOMAIN` after creating Supafolio Clerk instance.
- **Human input needed:** none

### Task 14: Update README, supabase/README, and routes.md

- **Depends on:** none
- **Creates/modifies:** `README.md`, `supabase/README.md`, `docs/routes.md`
- **Acceptance criteria:**
  - [ ] README: title and body use "Supafolio"; "cd coinbag" → "cd supafolio" (or "cd <repo-name>"); no broken "cd " with nothing after
  - [ ] supabase/README: "Coinbag" → "Supafolio" where it means the product
  - [ ] docs/routes.md: "Ask Coinbag" → "Ask Supafolio", `/ask-coinbag` → `/ask-supafolio`; any other product references updated
  - [ ] README and key docs read consistently as Supafolio
- **Notes:** Context-aware replace; step instructions and UI references must stay correct.
- **Human input needed:** none

### Task 15: Update all other docs (context-aware replace)

- **Depends on:** none
- **Creates/modifies:** All files under `docs/` (and root `.md` if any) that mention Coinbag, wellthy, coinbag.app, clerk.coinbag.app, or deployment project names
- **Acceptance criteria:**
  - [ ] Product name: "Coinbag" → "Supafolio", "coinbag" → "supafolio" where it means the product or package
  - [ ] Domains: `coinbag.app` → `supafolio.app`, `clerk.coinbag.app` → `clerk.supafolio.app`
  - [ ] Repo/project: `coinbag.git` → `supafolio.git` where relevant; "coinbag" project → "supafolio" project; "wellthy" project only where describing legacy Vercel project
  - [ ] Step instructions (e.g. "Select the supafolio project") and UI references are correct
- **Notes:** Ambiguous: ~40+ files; implementer must decide per file. Use context-aware replace, not a single global replace. See plan "Grep validation — allowed exceptions" for what may remain.
- **Human input needed:** none (implementer judgment on borderline cases)

### Task 16: Update SQL migration comments (optional)

- **Depends on:** none
- **Creates/modifies:** Comment lines in `supabase/migrations/*.sql`, `migration-outputs/*.sql`
- **Acceptance criteria:**
  - [ ] "Coinbag application" → "Supafolio application" in migration description comments, or skip and add these paths to allowed exceptions for Task 17
- **Notes:** Optional for consistency. If skipped, final grep (Task 17) must treat these as allowed exceptions.
- **Human input needed:** none

### Task 17: Final grep validation and fix remaining references

- **Depends on:** 13, 14, 15, 16
- **Creates/modifies:** Any files that still match after allowed exceptions (or no changes if grep already clean)
- **Acceptance criteria:**
  - [ ] Run `rg -i 'coinbag|wellthy'` across repo
  - [ ] Only allowed remaining matches: (1) file paths containing literal folder name `wellthy`, (2) doc titles/headings for legacy "wellthy" Vercel project (e.g. "Disable Wellthy Deployments"), (3) any line explicitly documented as intentional
  - [ ] Fix or document any other match; no unintended "coinbag" or "wellthy" in code, UI, or config
- **Notes:** Defines "done" for the rename. If SQL comments were skipped in Task 16, allow `supabase/migrations/` and `migration-outputs/` in exceptions.
- **Human input needed:** none

---

## Deferred / out of scope

- Rename local project folder (stays `wellthy`).
- Change Git remote or GitHub repo name (user does separately).
- Create or configure Clerk domain, Vercel project, or production domain (manual checklist in plan).
- Remove `clerk.coinbag.app` from CSP after Supafolio Clerk cutover (follow-up change).

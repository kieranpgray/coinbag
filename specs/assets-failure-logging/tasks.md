# Tasks: Improve Assets Failure Logging

Implementation tasks from the [plan](.cursor/plans/improve_assets_failure_logging_b3aea179.plan.md). Adds unconditional dev-only `console.warn` at critical failure points so "Unable to load assets" has a traceable cause in the console without requiring `VITE_DEBUG_LOGGING`.

## Critical Path

Task 1 → Task 2 → Task 3. Task 4 is independent (same pattern, liabilities). All can run in parallel if desired.

---

## Fetch Layer

### Task 1: Harden Supabase fetch wrapper with try/catch for network errors

- **Depends on:** none
- **Creates/modifies:** [src/lib/supabase/supabaseBrowserClient.ts](src/lib/supabase/supabaseBrowserClient.ts)
- **Acceptance criteria:**
  - [ ] `originalFetch` call wrapped in try/catch
  - [ ] On throw (network, CORS, etc.), log `[Supabase Fetch] Request failed:` with the error when `import.meta.env.DEV` and URL includes `/rest/v1/`
  - [ ] Re-throw the error after logging
  - [ ] Existing `!response.ok` logging unchanged and still runs in dev
  - [ ] Type-check passes
- **Notes:** Only log for REST requests; avoid logging auth/realtime noise. Use `typeof input === 'string' && input.includes('/rest/v1/')` for URL check.
- **Human input needed:** none

---

## Repo Layer

### Task 2: Add dev-only console.warn to assets repo list() failure paths

- **Depends on:** none
- **Creates/modifies:** [src/data/assets/supabaseRepo.ts](src/data/assets/supabaseRepo.ts)
- **Acceptance criteria:**
  - [ ] Before `return { data: [], error: ... }` on Supabase error (around line 246–250): add `if (import.meta.env.DEV) console.warn('[Assets] List failed:', ...)` with `error?.message ?? error`, `{ code, details }`
  - [ ] At validation failure path (around line 261–269): add same pattern with validation error details (e.g. `validation.error.flatten()` or `validation.error.message`)
  - [ ] Logs are dev-only; no production impact
  - [ ] Type-check passes
- **Notes:** Ensure both the primary error return and the validation-error return log. The catch block (around line 286) may also need a dev-only warn if it returns error.
- **Human input needed:** none

---

## Hook Layer

### Task 3: Add dev-only console.warn to useAssets when fetch fails

- **Depends on:** none
- **Creates/modifies:** [src/features/assets/hooks/useAssets.ts](src/features/assets/hooks/useAssets.ts)
- **Acceptance criteria:**
  - [ ] When `result.error` before `throw result.error` (around line 21): add `if (import.meta.env.DEV) console.warn('[useAssets] Fetch failed:', result.error)`
  - [ ] No change to control flow; still throws
  - [ ] Type-check passes
- **Notes:** Single insertion point in the queryFn.
- **Human input needed:** none

---

## Liabilities (Consistency)

### Task 4: Add dev-only console.warn to liabilities repo list() failure path

- **Depends on:** none
- **Creates/modifies:** [src/data/liabilities/supabaseRepo.ts](src/data/liabilities/supabaseRepo.ts)
- **Acceptance criteria:**
  - [ ] Before `return { data: [], error: ... }` when list fails (around line 277–282): add `if (import.meta.env.DEV) console.warn('[Liabilities] List failed:', ...)` with error message and code
  - [ ] Logs are dev-only
  - [ ] Type-check passes
- **Notes:** Mirror the assets pattern for consistency. Liabilities has fewer failure paths (no validation failure like assets).
- **Human input needed:** none

---

## Verification

After Tasks 1–4:

1. Run app in dev without `VITE_DEBUG_LOGGING`.
2. Reproduce assets load failure (e.g. trigger 400, or use DB missing columns).
3. Console should show at least one of: `[Supabase Fetch] Request failed`, `[Supabase Fetch] 400 ...`, `[Assets] List failed`, `[useAssets] Fetch failed`, or `[Liabilities] List failed`.

---

## Deferred Items

- Changing logger to always output errors in dev (broader; out of scope)
- Adding error code/message to the "Unable to load assets" UI (UX decision)

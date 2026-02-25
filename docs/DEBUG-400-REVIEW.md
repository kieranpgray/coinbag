# Staff Engineer Review: Assets/Liabilities 400 Error Resolution

## Problem Summary

- **Symptom**: Assets and liabilities fail to load; GET requests return 400 Bad Request OR validation fails with "Invalid data received from server"
- **Root causes**:
  1. PostgREST returns PGRST204 when requested columns don't exist (schema behind migrations) or schema cache is stale
  2. **Validation failure**: DB contains legacy asset types (`Investments`, `Other`) but schema expects post-rename enum (`Other Investments`). Migration 20260216120002 (rename) failed, so legacy types remain in DB.

## Review of Changes Made

### Concerns with Over-Aggressive Fallback (Reverted)

1. **Retry on any non-RLS error** added latency (up to 4 round-trips for assets) on every failure
2. **Masked real errors**: Network failures, 500s, timeouts would trigger fallback; retries would also fail, wasting requests
3. **Partial data risk**: Returning reduced columns while hiding infrastructure issues makes debugging harder

### Minimal Safe Approach

- **Gate fallback** on errors that plausibly indicate schema/column issues: 400, PGRST204, PGRST100, 42703, or message containing "column"/"bad request"
- **Do not retry** on RLS (42501, PGRST301), network errors, 500s, timeouts
- **Single fallback attempt** for liabilities; **cascading fallback** for assets (schema has multiple migration tiers)

### Validation failure fix (2024-02)

- In `mapDbRowToEntity`: normalize legacy types `Investments` | `Other` → `Other Investments` before schema validation. Handles DB state where rename migration 20260216120002 did not run.

### Operational Requirements

- Run `NOTIFY pgrst, 'reload schema'` after migrations (or restart project) so PostgREST picks up new columns
- Apply migrations before expecting full column set: `scripts/run-migration.mjs` or `supabase db push`

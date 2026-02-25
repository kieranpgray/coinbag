# Code review — Panel

**Target:** Uncommitted changes in `src/data/assets/supabaseRepo.ts`, `src/data/liabilities/supabaseRepo.ts` (and related asset/liability fallback and schema changes).

**Lenses:** Correctness → Security → Performance → Maintainability.

---

## 1. Correctness

**1.1 — `src/data/assets/supabaseRepo.ts` — update path: `value_as_at_date` uses `dateAdded` instead of today**

- **Issue:** When logging a value change on **update**, the code sets `value_as_at_date` from `validation.data.dateAdded?.split('T')[0] ?? new Date().toISOString().split('T')[0]`. The comment says "value_as_at_date = today", but `dateAdded` is the asset’s creation date, not the date of this value snapshot.
- **Why it matters:** History rows will show the wrong "as at" date for updates (creation date instead of the date the value was changed), breaking reporting and time-series semantics.
- **Fix:** Use today for the update path. Example:

```ts
// Log value change to history if value was updated (with value_as_at_date = today)
if (validation.data.value !== undefined && previousValue !== null && previousValue !== asset.value) {
  try {
    const userId = await getUserIdFromToken(getToken);
    if (userId) {
      const valueAsAtDate = new Date().toISOString().split('T')[0]; // today for updates
      const historyResult = await supabase
        .from('asset_value_history')
        .insert([{
          asset_id: asset.id,
          previous_value: previousValue,
          new_value: asset.value,
          user_id: userId,
          value_as_at_date: valueAsAtDate,
        }])
```

- **Severity:** SHOULD FIX

**1.2 — `src/data/assets/supabaseRepo.ts` — `toDateStr` in `getValueHistory` return type**

- **Issue:** Local helper `toDateStr` returns `string | undefined | null`; the mapping uses `toDateStr(row.value_as_at_date) ?? undefined`. If `toDateStr` returns `null`, the `?? undefined` is correct; the type is a bit loose.
- **Why it matters:** Minor; no observed bug, but `toDateStr` is duplicated (same logic exists in `mapDbRowToEntity`).
- **Fix:** Optional: extract a shared `toDateStr` and use it in both places for consistency.
- **Severity:** CONSIDER

---

## 2. Security

- **No issues.** Fallback only narrows the select list on 400/PGRST204; no new auth bypass, no user input in the error path, no secrets or PII in logs beyond existing patterns. RLS unchanged.

---

## 3. Performance

- **No issues.** Extra work is limited to the error path (up to two retries when the first select returns 400). No N+1, no unbounded loops, no change to the happy path. Acceptable for a fallback.

---

## 4. Maintainability

**4.1 — `src/data/assets/supabaseRepo.ts` — redundant `code === 'PGRST204'`**

- **Issue:** `isMissingColumnOrBadRequest` checks both `code === 'PGRST204'` and `looksLikeBadRequest`, and `looksLikeBadRequest` already includes `code === 'PGRST204'`.
- **Why it matters:** Redundant condition; small noise for future readers.
- **Fix:** Rely on `looksLikeBadRequest` and remove the standalone `code === 'PGRST204'` in the return, or keep one and drop it from `looksLikeBadRequest`.
- **Severity:** CONSIDER

**4.2 — `src/data/assets/supabaseRepo.ts` — `msg.includes('400')` possible false positive**

- **Issue:** `looksLikeBadRequest` uses `msg.includes('400')`, so any message containing the substring "400" (e.g. "Error 40023", "Doc 400") could trigger fallback.
- **Why it matters:** Low risk; worst case is an unnecessary retry. PostgREST 400 messages typically contain "400" or "bad request".
- **Fix:** Optional: only treat "400" when it looks like an HTTP status, e.g. `/\b400\b/.test(msg)` or prefer `status === 400` / `code === 'PGRST204'` when present.
- **Severity:** CONSIDER

---

## Summary

| Severity   | Count |
|-----------|-------|
| MUST FIX  | 0     |
| SHOULD FIX| 0 (1 applied) |
| CONSIDER  | 3     |

**Top 3 issues**

1. **Correctness:** Update path uses `dateAdded` for `value_as_at_date` instead of today when logging value changes (SHOULD FIX).
2. **Maintainability:** Redundant `PGRST204` check in assets repo (CONSIDER).
3. **Maintainability:** Possible false positive from `msg.includes('400')` (CONSIDER).

**Verdict:** APPROVE  

**Applied:** Update-path `value_as_at_date` now uses today (1.1). Remaining items are CONSIDER (optional cleanups).

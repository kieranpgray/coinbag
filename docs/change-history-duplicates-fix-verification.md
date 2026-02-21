# Change History Duplicates – Fix Verification

## What was fixed

Duplicate entries in Asset and Liability change history (in edit modals) were caused by both:

1. **Database triggers** inserting into `asset_value_history` / `liability_balance_history` on INSERT/UPDATE.
2. **Application code** in `src/data/assets/supabaseRepo.ts` and `src/data/liabilities/supabaseRepo.ts` also inserting into those tables after create/update.

The application-side history inserts were removed; the triggers remain the single source of history.

## Code changes

- **Assets:** Removed manual insert after create, `previousValue` fetch, and manual insert after update in `src/data/assets/supabaseRepo.ts`.
- **Liabilities:** Removed manual insert after create, `previousBalance` fetch, and manual insert after update in `src/data/liabilities/supabaseRepo.ts`. Removed unused `getUserIdFromToken` import.

## Automated tests

- `pnpm test` was run; failures are pre-existing (e.g. LocaleProvider, transactions empty state, env) and do not reference the assets or liabilities data layer.
- No tests in this repo target `supabaseRepo` or history inserts directly.

## Manual verification (recommended)

1. **Asset**
   - Create a new asset (e.g. Cash, value $1000). Open Edit → Change History. Expect **one** “Created with value” entry.
   - Edit the same asset and change value (e.g. to $1002). Save, open Edit → Change History. Expect **one** “Updated from … to …” entry for that change (no duplicate).
2. **Liability**
   - Create a new liability (e.g. balance $500). Open Edit → Change History. Expect **one** “Created with balance” entry.
   - Edit the same liability and change balance. Save, open Edit → Change History. Expect **one** “Updated from … to …” entry (no duplicate).

## Existing duplicate rows

Existing duplicate history rows in the database are unchanged. To clean them up (optional), run a one-off deduplication (e.g. keep one row per `(asset_id, previous_value, new_value, created_at)` and equivalent for liabilities) outside this fix.

# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all MUST FIX and SHOULD FIX items from the post-implementation code review of the Superfolio copy gap plan, with minimal, safe, targeted changes.

**Architecture:** Six independent fix tasks, each scoped to a single concern. No new dependencies. Tasks 1–5 are pure TypeScript/TSX. Task 6 modifies already-written-but-not-yet-run SQL migrations. Tasks can be executed in any order except Task 4 depends on the locale keys added in Task 5.

**Tech Stack:** React 18, TypeScript, react-i18next (i18n), date-fns, Radix UI Dialog, React Query v5, PostgreSQL (Supabase migrations)

---

## File Map

| File | Tasks | Change |
|------|-------|--------|
| `src/features/transfers/TransfersPage.tsx` | 1, 4 | parseISO fix; 'Unknown'→''; hardcoded strings to i18n |
| `src/features/transfers/components/TransferSuggestions.tsx` | 1, 4 | parseISO fix; remove L351 dev note; shortfall/unallocated note |
| `src/features/dashboard/components/NetWorthCard.tsx` | 2 | historyLoading → null/skeleton; "Net Worth" → t() |
| `src/components/shared/ConfirmDestructiveDialog.tsx` | 3 | ref guard; body: string → ReactNode |
| `src/locales/en-AU/pages.json` | 5 | Add privacy toggle + edit plan + context bar + netWorth.title keys |
| `src/locales/en-US/pages.json` | 5 | Same as en-AU (shared strings) |
| `src/components/shared/PrivacyModeToggle.tsx` | 5 | Tooltip + labels → t() |
| `supabase/migrations/20260406120000_rename_asset_types_wave1c.sql` | 6 | Wrap RLS disable/enable in transaction; add RAISE WARNING |
| `supabase/migrations/20260406120001_expand_liability_types.sql` | 6 | Same as above |

---

## Task 1: Fix timezone bug — `new Date(dateString)` → `parseISO`

**The bug:** `payCycle.nextPayDate` is a `YYYY-MM-DD` string. `new Date('2026-04-15')` parses it as UTC midnight. In any UTC-negative timezone (US East = UTC-5), this renders as the previous day — the upcoming arrival label shows the wrong day for the majority of users.

**Files:**
- Modify: `src/features/transfers/TransfersPage.tsx` (lines 76, 115)
- Modify: `src/features/transfers/components/TransferSuggestions.tsx` (lines 102–103)

- [ ] **Step 1: Confirm parseISO is already imported in date-fns**

  Run:
  ```bash
  grep "parseISO" src/features/transfers/TransfersPage.tsx src/features/transfers/components/TransferSuggestions.tsx
  ```
  Expected: no matches — `parseISO` is not yet imported in either file.

- [ ] **Step 2: Fix `TransfersPage.tsx`**

  Read the current import line for `date-fns` in `TransfersPage.tsx`. It looks like:
  ```ts
  import { format } from 'date-fns';
  ```
  Change it to:
  ```ts
  import { format, parseISO } from 'date-fns';
  ```

  Then replace the two `new Date(payCycle.nextPayDate)` calls:

  Line ~76 (pageSubtitle active state):
  ```ts
  // Before
  date: format(new Date(payCycle.nextPayDate), 'EEEE d MMM'),

  // After
  date: format(parseISO(payCycle.nextPayDate), 'EEEE d MMM'),
  ```

  Line ~115 (nextPayDateFormatted):
  ```ts
  // Before
  ? format(new Date(payCycle.nextPayDate), 'EEEE d MMM yyyy')

  // After
  ? format(parseISO(payCycle.nextPayDate), 'EEEE d MMM yyyy')
  ```

- [ ] **Step 3: Fix `TransferSuggestions.tsx`**

  Read the current import for `date-fns` in `TransferSuggestions.tsx`. It looks like:
  ```ts
  import { format } from 'date-fns';
  ```
  Change it to:
  ```ts
  import { format, parseISO } from 'date-fns';
  ```

  Then replace lines 102–103:
  ```ts
  // Before
  const upcomingDay = payCycle ? format(new Date(payCycle.nextPayDate), 'EEEE') : '';
  const upcomingDate = payCycle ? format(new Date(payCycle.nextPayDate), 'd MMM') : '';

  // After
  const upcomingDay = payCycle ? format(parseISO(payCycle.nextPayDate), 'EEEE') : '';
  const upcomingDate = payCycle ? format(parseISO(payCycle.nextPayDate), 'd MMM') : '';
  ```

- [ ] **Step 4: Verify no remaining `new Date(payCycle` calls**

  Run:
  ```bash
  grep -n "new Date(payCycle" src/features/transfers/TransfersPage.tsx src/features/transfers/components/TransferSuggestions.tsx
  ```
  Expected: no matches.

- [ ] **Step 5: Type-check**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0 (or only pre-existing errors unrelated to these files).

- [ ] **Step 6: Commit**

  ```bash
  git add src/features/transfers/TransfersPage.tsx src/features/transfers/components/TransferSuggestions.tsx
  git commit -m "fix: use parseISO for YYYY-MM-DD date strings to avoid UTC timezone offset"
  ```

---

## Task 2: Fix `NetWorthCard` — historyLoading flash + hardcoded "Net Worth"

**The bugs:**
1. While `historyLoading` is true, the component returns `t('netWorth.holdingSteady')` — users see "Holding steady this month" briefly before their real delta arrives. Should return `null` instead.
2. The empty state `<h2>` hardcodes `"Net Worth"` instead of using i18n.

**Files:**
- Modify: `src/features/dashboard/components/NetWorthCard.tsx`
- Modify: `src/locales/en-AU/pages.json` (add `netWorth.title`)
- Modify: `src/locales/en-US/pages.json` (same)

- [ ] **Step 1: Add `netWorth.title` to locale files**

  In `src/locales/en-AU/pages.json`, find the `"netWorth"` object (around line 57) and add the title key:
  ```json
  "netWorth": {
    "title": "Net worth",
    "holdingSteady": "Holding steady this month",
    "upThisMonth": "+{{amount}} this month",
    "downThisMonth": "−{{amount}} this month",
    "privacyAmount": "••••"
  }
  ```

  Apply the same change to `src/locales/en-US/pages.json`.

- [ ] **Step 2: Fix historyLoading — return null instead of "Holding steady"**

  In `src/features/dashboard/components/NetWorthCard.tsx`, find the `netWorthMonthNote` useMemo (lines 99–122). The first guard is:
  ```ts
  // Before
  if (historyLoading) {
    return t('netWorth.holdingSteady');
  }

  // After
  if (historyLoading) {
    return null;
  }
  ```

  The return type of the memo changes from `string` to `string | null`. Check that `NetWorthSummary` accepts `netWorthFootnote?: string | null` — if its prop type is `string`, update it to `string | null | undefined`. Read `src/features/dashboard/components/NetWorthSummary.tsx` to confirm.

- [ ] **Step 3: Fix hardcoded "Net Worth" in empty state**

  In `NetWorthCard.tsx`, find the empty state block (inside `if (isEmpty)`). The heading currently reads:
  ```tsx
  // Before
  <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground mb-2">Net Worth</h2>

  // After
  <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground mb-2">{t('netWorth.title')}</h2>
  ```

  There is also a hardcoded `"Net Worth"` heading in the main (non-empty) render path around line 223. Apply the same fix there:
  ```tsx
  // Before
  <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
    Net Worth
  </h2>

  // After
  <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
    {t('netWorth.title')}
  </h2>
  ```

- [ ] **Step 4: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0 (or only pre-existing errors).

- [ ] **Step 5: Commit**

  ```bash
  git add src/features/dashboard/components/NetWorthCard.tsx \
          src/locales/en-AU/pages.json \
          src/locales/en-US/pages.json
  git commit -m "fix: networth card shows null during history load instead of false steady state; move Net Worth heading to i18n"
  ```

---

## Task 3: Fix `ConfirmDestructiveDialog` — double-fire guard + ReactNode body

**The bugs:**
1. Rapid double-click on Confirm can fire `onConfirm` twice before React re-renders with `isLoading={true}`.
2. `body` typed as `string` prevents future rich content in dialog bodies.

**Files:**
- Modify: `src/components/shared/ConfirmDestructiveDialog.tsx`

- [ ] **Step 1: Add ref guard and widen body type**

  Replace the full contents of `src/components/shared/ConfirmDestructiveDialog.tsx`:

  ```tsx
  import { useRef } from 'react';
  import { Loader2 } from 'lucide-react';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import { Button } from '@/components/ui/button';

  interface ConfirmDestructiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    body: React.ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    isLoading?: boolean;
  }

  export function ConfirmDestructiveDialog({
    open,
    onOpenChange,
    title,
    body,
    confirmLabel,
    cancelLabel = 'Keep it',
    onConfirm,
    isLoading,
  }: ConfirmDestructiveDialogProps) {
    const confirming = useRef(false);

    const handleConfirm = () => {
      if (confirming.current) return;
      confirming.current = true;
      onConfirm();
    };

    // Reset the guard when the dialog closes so it can be re-opened
    const handleOpenChange = (next: boolean) => {
      if (!next) confirming.current = false;
      onOpenChange(next);
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild={typeof body !== 'string'}>
              {typeof body === 'string' ? body : <div>{body}</div>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  ```

  Note: `DialogDescription` renders a `<p>` by default. Passing `asChild` when `body` is a ReactNode (not a plain string) avoids a `<p>` wrapping a `<div>` which is invalid HTML. When `body` is a plain string the existing rendering path is unchanged — all current callers pass strings and require no updates.

- [ ] **Step 2: Verify all call sites still compile**

  Run:
  ```bash
  grep -rn "ConfirmDestructiveDialog" src/ --include="*.tsx" -l
  ```
  This lists all files using the component. Then:
  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0. All existing callers pass `body` as a `string`, which is assignable to `React.ReactNode` — no call sites need updating.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/shared/ConfirmDestructiveDialog.tsx
  git commit -m "fix: guard ConfirmDestructiveDialog against double-fire; widen body to ReactNode"
  ```

---

## Task 4: Fix `TransfersPage` + `TransferSuggestions` — hardcoded strings and 'Unknown' fallback

**The issues:**
1. `'Unknown'` renders in the user-facing upcoming arrival label when the primary account lookup fails.
2. "Edit plan" button label, pay cycle context bar strings, and frequency labels are hardcoded English strings not going through i18n.
3. `TransferSuggestions.tsx` line 351 contains a developer implementation note rendered in user-facing UI.

> **Depends on:** Task 5 (adds the locale keys used here). Complete Task 5 first.

**Files:**
- Modify: `src/features/transfers/TransfersPage.tsx`
- Modify: `src/features/transfers/components/TransferSuggestions.tsx`

- [ ] **Step 1: Fix 'Unknown' → '' in `TransfersPage.tsx`**

  Find line ~119:
  ```ts
  // Before
  const primaryAccountName = payCycle
    ? accounts.find((acc) => acc.id === payCycle.primaryIncomeAccountId)?.accountName || 'Unknown'
    : '';

  // After
  const primaryAccountName = payCycle
    ? accounts.find((acc) => acc.id === payCycle.primaryIncomeAccountId)?.accountName ?? ''
    : '';
  ```
  Using `??` (nullish coalescing) is more precise than `||` since `accountName` of `''` should stay `''`, not be replaced.

- [ ] **Step 2: Move "Edit plan" button label to i18n in `TransfersPage.tsx`**

  Find the Edit plan button (~line 132):
  ```tsx
  // Before
  <Button variant="ghost" size="sm" onClick={() => setEditPayCycleOpen(true)}>
    Edit plan
  </Button>

  // After
  <Button variant="ghost" size="sm" onClick={() => setEditPayCycleOpen(true)}>
    {t('allocate.editPlanCta', { ns: 'pages' })}
  </Button>
  ```

- [ ] **Step 3: Move pay cycle context bar strings to i18n in `TransfersPage.tsx`**

  Find the pay cycle context bar block (~lines 138–149):
  ```tsx
  // Before
  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
    <p className="text-body-sm text-foreground">
      <strong>Next pay:</strong> {nextPayDateFormatted} ·{' '}
      {payCycle.frequency === 'weekly'
        ? 'Weekly'
        : payCycle.frequency === 'fortnightly'
        ? 'Fortnightly'
        : 'Monthly'}{' '}
      → {primaryAccountName}
    </p>
  </div>

  // After
  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
    <p className="text-body-sm text-foreground">
      <strong>{t('allocate.contextBar.nextPay', { ns: 'pages' })}</strong>{' '}
      {nextPayDateFormatted} ·{' '}
      {t(`allocate.contextBar.${payCycle.frequency}`, { ns: 'pages' })}{' '}
      → {primaryAccountName}
    </p>
  </div>
  ```

- [ ] **Step 4: Remove developer note from `TransferSuggestions.tsx`**

  Find and delete the hardcoded implementation note at the bottom of the component return (line ~348–351):
  ```tsx
  // Remove this entire block:
  <p className="flex items-center gap-2 mt-4 text-caption text-muted-foreground">
    <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
    Repayment rows are listed explicitly and excluded from other transfer totals.
  </p>
  ```

  After removal, check whether the `Info` icon import from `lucide-react` is still used elsewhere in the file (it is — it's used in the tooltip trigger spans at lines ~59, ~207). Leave the import in place.

- [ ] **Step 5: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/features/transfers/TransfersPage.tsx \
          src/features/transfers/components/TransferSuggestions.tsx
  git commit -m "fix: remove user-visible dev note; move hardcoded strings to i18n; fix Unknown account fallback"
  ```

---

## Task 5: Add missing i18n keys + fix `PrivacyModeToggle` hardcoded strings

**The issues:**
1. `PrivacyModeToggle` has tooltip text and button labels hardcoded in English.
2. `TransfersPage` needs `allocate.editPlanCta` and `allocate.contextBar.*` keys (used by Task 4).
3. `NetWorthCard` needs `netWorth.title` (used by Task 2, but Task 2 adds that key — verify it's there).

**Files:**
- Modify: `src/locales/en-AU/pages.json`
- Modify: `src/locales/en-US/pages.json`
- Modify: `src/components/shared/PrivacyModeToggle.tsx`

- [ ] **Step 1: Add missing keys to `src/locales/en-AU/pages.json`**

  Add `editPlanCta` inside the existing `"allocate"` object (alongside `saveCta`):
  ```json
  "allocate": {
    "editPlanCta": "Edit plan",
    "editContextNote": "...",
    ...
  }
  ```

  Add a new `"contextBar"` object inside `"allocate"`:
  ```json
  "allocate": {
    "editPlanCta": "Edit plan",
    "contextBar": {
      "nextPay": "Next pay:",
      "weekly": "Weekly",
      "fortnightly": "Fortnightly",
      "monthly": "Monthly"
    },
    ...
  }
  ```

  Add a `"privacyToggle"` object at the top level of the JSON:
  ```json
  "privacyToggle": {
    "tooltip": "Hides all dollar values. Tap to reveal.",
    "activeLabel": "Privacy on",
    "inactiveLabel": "Privacy mode",
    "enableAriaLabel": "Enable privacy mode",
    "disableAriaLabel": "Disable privacy mode"
  }
  ```

- [ ] **Step 2: Apply identical changes to `src/locales/en-US/pages.json`**

  All keys added in Step 1 are locale-neutral (no AU-specific terms). Apply the exact same additions to `en-US/pages.json`.

- [ ] **Step 3: Update `PrivacyModeToggle.tsx` to use i18n**

  Replace the full contents of `src/components/shared/PrivacyModeToggle.tsx`:

  ```tsx
  import { Eye, EyeOff } from 'lucide-react';
  import { useTranslation } from 'react-i18next';
  import { Button } from '@/components/ui/button';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from '@/components/ui/tooltip';
  import { useTheme } from '@/contexts/ThemeContext';
  import { cn } from '@/lib/utils';

  interface PrivacyModeToggleProps {
    className?: string;
  }

  export function PrivacyModeToggle({ className }: PrivacyModeToggleProps) {
    const { privacyMode, togglePrivacyMode } = useTheme();
    const { t } = useTranslation('pages');

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePrivacyMode}
              aria-label={
                privacyMode
                  ? t('privacyToggle.disableAriaLabel')
                  : t('privacyToggle.enableAriaLabel')
              }
              aria-pressed={privacyMode}
              className={cn(
                'gap-1.5 text-sm font-medium transition-colors',
                privacyMode
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                className
              )}
            >
              {privacyMode ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>
                {privacyMode
                  ? t('privacyToggle.activeLabel')
                  : t('privacyToggle.inactiveLabel')}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('privacyToggle.tooltip')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  ```

- [ ] **Step 4: Verify keys are valid JSON**

  Run:
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('src/locales/en-AU/pages.json', 'utf8')); console.log('AU: valid')"
  node -e "JSON.parse(require('fs').readFileSync('src/locales/en-US/pages.json', 'utf8')); console.log('US: valid')"
  ```
  Expected: `AU: valid` / `US: valid`

- [ ] **Step 5: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: exit 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/locales/en-AU/pages.json \
          src/locales/en-US/pages.json \
          src/components/shared/PrivacyModeToggle.tsx
  git commit -m "fix: move PrivacyModeToggle strings to i18n; add editPlanCta and contextBar locale keys"
  ```

---

## Task 6: Fix migration files — transaction safety + audit warning

**The bug:** Both migrations disable RLS, perform UPDATEs, then re-enable RLS — but none of this is wrapped in a transaction. If any statement fails mid-migration, RLS stays disabled on the production table until manually fixed, exposing all users' financial data to each other.

Additionally, both migrations silently reclassify unrecognised type values with no observable trace.

> **Important:** These migrations have not yet been applied to production. Modifying the migration files directly is safe. If they had already run, a new migration would be required instead.

**Files:**
- Modify: `supabase/migrations/20260406120000_rename_asset_types_wave1c.sql`
- Modify: `supabase/migrations/20260406120001_expand_liability_types.sql`

- [ ] **Step 1: Rewrite `20260406120000_rename_asset_types_wave1c.sql`**

  Replace the full file contents:

  ```sql
  -- Migration: Rename asset type stored values (Wave 1c copy / data alignment)
  -- Description: Updates human-readable type strings on assets.type; replaces CHECK constraint.
  -- Replaces: Stock→Shares, Real Estate→Property, Superannuation→Super, Vehicles→Vehicle,
  --           RSU→RSUs, Other Investments→Other asset. Unchanged: Crypto, Cash.

  -- Step 1: Drop existing CHECK and add updated constraint (NOT VALID so it doesn't scan yet)
  ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS assets_type_check;

  ALTER TABLE assets
    ADD CONSTRAINT assets_type_check
    CHECK (type IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs'))
    NOT VALID;

  -- Step 2: Migrate data inside a transaction so RLS is never left disabled on failure
  BEGIN;

  ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

  UPDATE assets SET type = 'Shares'     WHERE type = 'Stock';
  UPDATE assets SET type = 'Property'   WHERE type = 'Real Estate';
  UPDATE assets SET type = 'Super'      WHERE type = 'Superannuation';
  UPDATE assets SET type = 'Vehicle'    WHERE type = 'Vehicles';
  UPDATE assets SET type = 'RSUs'       WHERE type = 'RSU';
  UPDATE assets SET type = 'Other asset' WHERE type = 'Other Investments';

  UPDATE assets SET type = TRIM(type) WHERE type IS NOT NULL AND type <> TRIM(type);

  DO $$
  DECLARE unrecognised_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO unrecognised_count
    FROM assets
    WHERE type IS NOT NULL
      AND type NOT IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs');
    IF unrecognised_count > 0 THEN
      RAISE WARNING 'Coercing % unrecognised asset type value(s) to ''Other asset''. Review assets table for data quality.', unrecognised_count;
    END IF;
  END $$;

  UPDATE assets SET type = 'Other asset'
    WHERE type IS NOT NULL
    AND type NOT IN ('Property', 'Other asset', 'Vehicle', 'Crypto', 'Cash', 'Super', 'Shares', 'RSUs');

  ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

  COMMIT;

  -- Step 3: Validate constraint outside the transaction (requires full table scan)
  ALTER TABLE assets VALIDATE CONSTRAINT assets_type_check;

  COMMENT ON COLUMN assets.type IS 'Asset type: Property, Other asset, Vehicle, Crypto, Cash, Super, Shares, RSUs';
  ```

- [ ] **Step 2: Rewrite `20260406120001_expand_liability_types.sql`**

  Replace the full file contents:

  ```sql
  -- Migration: Expand liability type stored values (Wave 3.2 liability type granularity)
  -- Description: Replaces 3 broad liability categories with 6 granular named types.
  -- Old values: Loans, Credit Cards, Other
  -- New values: Home loan, Personal loan, Car loan, Credit card, HECS / HELP debt, Other liability
  -- Data migration: Loans→Home loan, Credit Cards→Credit card, Other→Other liability

  -- Step 1: Drop existing CHECK and add updated constraint (NOT VALID)
  ALTER TABLE liabilities
    DROP CONSTRAINT IF EXISTS liabilities_type_check;

  ALTER TABLE liabilities
    ADD CONSTRAINT liabilities_type_check
    CHECK (type IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS / HELP debt', 'Other liability'))
    NOT VALID;

  -- Step 2: Migrate data inside a transaction so RLS is never left disabled on failure
  BEGIN;

  ALTER TABLE liabilities DISABLE ROW LEVEL SECURITY;

  UPDATE liabilities SET type = 'Home loan'       WHERE type = 'Loans';
  UPDATE liabilities SET type = 'Credit card'     WHERE type = 'Credit Cards';
  UPDATE liabilities SET type = 'Other liability'  WHERE type = 'Other';

  UPDATE liabilities SET type = TRIM(type) WHERE type IS NOT NULL AND type <> TRIM(type);

  DO $$
  DECLARE unrecognised_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO unrecognised_count
    FROM liabilities
    WHERE type IS NOT NULL
      AND type NOT IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS / HELP debt', 'Other liability');
    IF unrecognised_count > 0 THEN
      RAISE WARNING 'Coercing % unrecognised liability type value(s) to ''Other liability''. Review liabilities table for data quality.', unrecognised_count;
    END IF;
  END $$;

  UPDATE liabilities SET type = 'Other liability'
    WHERE type IS NOT NULL
    AND type NOT IN ('Home loan', 'Personal loan', 'Car loan', 'Credit card', 'HECS / HELP debt', 'Other liability');

  ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

  COMMIT;

  -- Step 3: Validate constraint outside the transaction
  ALTER TABLE liabilities VALIDATE CONSTRAINT liabilities_type_check;

  COMMENT ON COLUMN liabilities.type IS 'Liability type: Home loan, Personal loan, Car loan, Credit card, HECS / HELP debt, Other liability';
  ```

- [ ] **Step 3: Verify SQL is syntactically valid with a dry-run lint**

  Run:
  ```bash
  npx supabase db lint 2>/dev/null || echo "supabase CLI not available — manual review required"
  ```

  If Supabase CLI is available and linked, also run:
  ```bash
  npx supabase db diff --use-migra 2>/dev/null || true
  ```

  If CLI is not available, manually confirm:
  - Every `BEGIN;` has a matching `COMMIT;`
  - `VALIDATE CONSTRAINT` appears **after** the `COMMIT;`
  - `ENABLE ROW LEVEL SECURITY` appears **before** the `COMMIT;`

- [ ] **Step 4: Commit**

  ```bash
  git add supabase/migrations/20260406120000_rename_asset_types_wave1c.sql \
          supabase/migrations/20260406120001_expand_liability_types.sql
  git commit -m "fix: wrap RLS disable/enable in transaction to prevent exposure on migration failure; add RAISE WARNING for unrecognised type coercion"
  ```

---

## Self-Review

**Spec coverage check (MUST FIX items from review):**
- [x] `new Date(payCycle.nextPayDate)` timezone bug → Task 1
- [x] RLS transaction safety in migrations → Task 6
- [x] `onConfirm` double-fire in ConfirmDestructiveDialog → Task 3
- [x] `'Unknown'` fallback in TransfersPage → Task 4
- [x] L351 dev note in TransferSuggestions → Task 4
- [x] `historyLoading` → null instead of "Holding steady" → Task 2

**SHOULD FIX items from review:**
- [x] Hardcoded "Edit plan" button label → Task 4/5
- [x] Hardcoded pay cycle context bar strings → Task 4/5
- [x] PrivacyModeToggle hardcoded strings → Task 5
- [x] "Net Worth" hardcoded in empty state → Task 2
- [x] Silent coercion audit trail in migrations → Task 6
- [x] `body: string` → `ReactNode` in ConfirmDestructiveDialog → Task 3

**Items intentionally left out (CONSIDER severity):**
- `usePayCycle` called in both parent and child — React Query deduplicates the network request; refactor would increase prop-drilling complexity for marginal gain. Backlog.
- `findHistoryPointClosestToDaysAgo` linear scan — ~1,825 items max, well within JS performance budget. Backlog.
- Shortfall + UnallocatedWarning coordination — these measure genuinely different things; documenting the distinction in a code comment is sufficient and is left to the discretion of the next engineer who touches the Allocate page.

**Placeholder scan:** No TBDs, no "implement later", no steps without code. ✓

**Type consistency:** `body: React.ReactNode` introduced in Task 3; all existing call sites pass `string` which is assignable to `ReactNode`. `netWorthFootnote` may need a type update in `NetWorthSummary` — Task 2 Step 2 explicitly calls this out. ✓

# PRO-30 — Recurring: Single page-level pay frequency control (SC4)

## Ticket intent

Consolidate three independent frequency `<Select>` controls (one each in `BudgetBreakdown`, `IncomeSection`, and `ExpensesSection`) into a single control placed in the `BudgetPage` header. All three sections display amounts using a common "view frequency" — weekly / fortnightly / monthly / quarterly / annually. Having three independent controls creates confusion, wastes layout space, and violates the principle that this is a single conceptual decision.

## Family plan reference

No direct family plan dependency. This is a standalone UX simplification on the Recurring/Budget page.

## Critique mapping

- **T17** — Typography / layout density: Removing three redundant controls reduces visual noise.
- **SC4** — Single control principle: One decision (pay frequency view) → one control.

## Dependency assessment

No blockers. Independent ticket. Does not depend on PRO-9 or other foundation tickets.  
PRO-31 (BudgetBreakdown hierarchy) should come **after** this ticket to avoid state thrash — this ticket simplifies the frequency state shape that PRO-31 will build on.

## Files/components to inspect first

| File | Status |
|---|---|
| `src/features/budget/BudgetPage.tsx` | ✅ Inspected |
| `src/features/budget/components/BudgetBreakdown.tsx` | ✅ Inspected |
| `src/features/budget/components/IncomeSection.tsx` | ✅ Inspected |
| `src/features/budget/components/ExpensesSection.tsx` | ✅ Inspected |
| `src/features/budget/components/BudgetTopBar.tsx` | ✅ Inspected (unused by BudgetPage) |
| `src/features/budget/utils/frequencyConversion.ts` | ✅ Inspected |

**Key findings:**

1. `BudgetPage.tsx` currently maintains **three** frequency states: `breakdownFrequency`, `incomeFrequency`, `expensesFrequency`. Only `breakdownFrequency` is actively used as a prop — the other two are set by child callbacks but never consumed.
2. `BudgetBreakdown.tsx` has its own `<Select>` and calls `onFrequencyChange` back to parent.
3. `IncomeSection.tsx` has its own `<Select>`, its own `localFrequency` state, and a `hasManualOverride` ref pattern — over-engineered for independent override that the ticket wants to remove.
4. `ExpensesSection.tsx` mirrors `IncomeSection` — same pattern.
5. `BudgetTopBar.tsx` is **not used** in `BudgetPage.tsx` — no action needed.
6. `FREQUENCY_OPTIONS` from `frequencyConversion.ts` has 5 options: Weekly / Fortnightly / Monthly / Quarterly / Annually.

## Proposed implementation path

### Step 1 — Simplify `BudgetBreakdown.tsx`
- Remove the `<Select>` from the component header.
- Remove `onFrequencyChange` from props interface.
- Continue to receive `frequency` as a required prop from parent.

### Step 2 — Simplify `IncomeSection.tsx`
- Replace `parentFrequency?: Frequency` with `frequency: Frequency` (required, no optional).
- Remove `onFrequencyChange` prop.
- Remove `localFrequency` state, `hasManualOverride` ref, and the `useEffect` that synced them.
- Remove the `<Select>` from the header row.
- Use `frequency` directly for display calculations (was `displayFrequency`).

### Step 3 — Simplify `ExpensesSection.tsx`
- Same changes as `IncomeSection.tsx`:
  - `frequency: Frequency` required, remove `parentFrequency`/`onFrequencyChange`.
  - Remove `localFrequency`, `hasManualOverride`, `useEffect` sync logic.
  - Remove the `<Select>` from the header row.

### Step 4 — Update `BudgetPage.tsx`
- Remove `incomeFrequency` and `expensesFrequency` states (never consumed).
- Rename `breakdownFrequency` → `frequency` for clarity, single source of truth.
- Simplify `BudgetBreakdown`'s `onFrequencyChange` handler to just `setFrequency`.
- Remove the `onFrequencyChange` prop from `BudgetBreakdown` entirely.
- Pass `frequency` directly to `IncomeSection` and `ExpensesSection` (no more `parentFrequency`).
- Remove `onFrequencyChange` callbacks from `IncomeSection` and `ExpensesSection`.
- Add a single `<Select>` in the page header (right side, beside the "Plan transfers" button), using `FREQUENCY_OPTIONS` from `frequencyConversion.ts`.

## Risks / regression watchouts

1. **Display amounts in IncomeSection / ExpensesSection** — currently using `localFrequency || parentFrequency || 'monthly'` fallback chain. After change, using `frequency` directly (always defined). Verify amounts still display correctly.
2. **BudgetBreakdown still shows frequency-converted totals** — not changing calculation logic; only removing the control. Amounts continue to use `convertToFrequency` with the prop.
3. **`incomeFrequency` and `expensesFrequency` removal** — these state variables were only populated by child callbacks and never read back in `BudgetPage`. Safe to remove.
4. **IncomeSection empty state** — still calls `onCreate` which opens the modal. No change needed.
5. **No context or Zustand introduced** — state stays as `useState` in `BudgetPage`, prop-drilled down. Acceptable for this scope.

## Validation checklist

- [ ] Single frequency selector visible in page header
- [ ] No frequency selector visible in BudgetBreakdown
- [ ] No frequency selector visible in IncomeSection header
- [ ] No frequency selector visible in ExpensesSection header
- [ ] Changing frequency in header updates BudgetBreakdown displayed amounts
- [ ] Changing frequency in header updates IncomeSection displayed amounts
- [ ] Changing frequency in header updates ExpensesSection displayed amounts
- [ ] "Add Income" and "Add Expense" buttons still visible and functional
- [ ] TypeScript: no new type errors introduced
- [ ] No linter errors on edited files

## Implementation readiness

**Ready**

# PRO-30 Review — Recurring: Single page-level pay frequency control

## Review verdict

**Pass**

## What is correct

1. **Single frequency state** — `BudgetPage.tsx` now has one `useState<Frequency>('monthly')` replacing the three-state pattern (`breakdownFrequency`, `incomeFrequency`, `expensesFrequency`). The two unused child-tracking states have been removed cleanly.

2. **One control in the header** — A `<Select>` using `FREQUENCY_OPTIONS` from `frequencyConversion.ts` is placed in the page header alongside the "Plan transfers" button. This is the only frequency selector on the page; it controls all three display sections simultaneously.

3. **`BudgetBreakdown.tsx` simplified** — `onFrequencyChange` removed from props and interface. The `<Select>` in the card header removed. Component is now purely display-driven; receives `frequency` as a required prop.

4. **`IncomeSection.tsx` simplified** — `parentFrequency`, `onFrequencyChange`, `localFrequency` state, `hasManualOverride` ref, and the `useEffect` sync logic all removed. Props interface is now flat: `frequency: Frequency` (required). The `<Select>` removed from the section header row.

5. **`ExpensesSection.tsx` simplified** — Same simplification as `IncomeSection`: no local frequency state, no override ref, no sync effect, no `<Select>`. Uses `frequency` prop directly for display amounts and passes it through to `ExpenseList` as `displayFrequency`.

6. **No new patterns introduced** — Prop drilling from `BudgetPage` is used, consistent with the existing codebase. No new context or state library added.

7. **Calculation logic untouched** — `convertToFrequency`, `calculateMonthlyEquivalent`, and all amount computations are unchanged. Only the UI control location changed.

8. **Zero linter errors** — All four edited files pass lint clean.

9. **Correct prop name migration** — All `parentFrequency=` and `onFrequencyChange=` call sites in `BudgetPage.tsx` updated to `frequency=`.

## What is off

Nothing material. One minor observation:

- The `BudgetBreakdown` header `<div>` was changed from `flex items-center justify-between` to `flex items-center` since there is no longer a right-side element. This is correct but a minor layout delta PRO-31 may want to revisit if it adds content to the BudgetBreakdown header.

## Required fixes

None.

## Regression risks

**Low.** The changes are purely subtractive at the component level — no new branches, no new state, no new effects. The key risk to monitor:

1. **Frequency display for sections** — previously `IncomeSection` and `ExpensesSection` could hold a locally-overridden frequency independently. That capability is intentionally removed. If any user-facing test existed that relied on the sections being independently switchable, it would now fail by design (the ticket explicitly removes this).
2. **`ExpenseList` `displayFrequency` prop** — previously received `localFrequency || parentFrequency || 'monthly'`. Now receives `frequency` directly. Since `frequency` always has a value (defaults to `'monthly'`), the fallback chain is no longer needed and the simpler form is correct.

## Should this ticket be closed

**Yes**

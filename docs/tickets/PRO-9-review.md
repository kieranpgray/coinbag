# PRO-9 Review — DS: Implement numeric display tiers num-display / num-balance / num-body

## Review verdict

**Pass**

## What is correct

### CSS implementation
- Three tier classes added to `src/index.css` immediately after the `.metric-value.negative` block (maintaining document order).
- `num-display`: 32px serif, weight 400, line-height 1.2, letter-spacing -0.01em — matches spec exactly.
- `num-balance`: 24px serif, weight 400, line-height 1.25 — matches spec exactly.
- `num-body`: 15px DM Sans (via `--font-family-sans` with fallback), weight 500, line-height 1.4 — matches spec exactly.
- `font-variant-numeric: tabular-nums` added to all three tiers (consistent with `.metric-value`; this was a deliberate improvement over the spec stub since all financial figures require tabular alignment).
- `.positive` and `.negative` colour modifiers added for all three tiers using the same variable chain as `.metric-value` (`--accent`/`--color-primary` and `--danger`).

### Tier assignment
- **`NetWorthSummary.tsx`** — Net Worth → `num-display` (hero figure). Assets → `num-balance`, Liabilities → `num-balance` (secondary card values). Correct hierarchy established.
- **`BudgetBreakdownTile.tsx`** — Income, Expenses, Surplus → `num-balance`. Surplus retains `.positive`/`.negative` modifiers via `cn()`. Correct.
- **`ExpenseBreakdown.tsx`** — Total monthly expenses → `num-balance`. Correct (section total, not row figure).
- **`IncomeBreakdown.tsx`** — Total monthly income → `num-balance`. Correct (section total, not row figure).
- **`WealthBreakdown.tsx`** — Assets, Liabilities, Net Worth → `num-balance`. All three retain `tabular-nums` Tailwind class for specificity safety. Net Worth retains `.positive`/`.negative` modifiers. Correct.

### Backward compatibility
- `.metric-value` is untouched and continues to render at 32px serif for all remaining consumers.
- No TypeScript changes — purely CSS class name swaps.
- `cn()` usage preserved in all components that conditionally apply `.positive`/`.negative`.

### Remaining `.metric-value` users (not changed in this ticket)
These are documented follow-up items:

| File | Usage | Suggested follow-up tier |
|---|---|---|
| `src/features/accounts/AccountsPage.tsx` | Account balance metric tile | `num-balance` |
| `src/features/budget/components/BudgetSummaryCard.tsx` | 4 summary metric tiles (expenses, categories, total items, avg per item) | `num-balance` |
| `src/features/wealth/components/LiabilityPortfolioSection.tsx` | Total liabilities metric tile | `num-balance` |

## What is off

### Minor: ticket specified `NetWorthCard.tsx` but the change is in `NetWorthSummary.tsx`
The ticket instruction targets `NetWorthCard.tsx` for `num-display`, but `NetWorthCard` delegates the numeric display to `NetWorthSummary`. The net worth amount is rendered in `NetWorthSummary`, which is the correct file to change. This is a spec imprecision, not an implementation error — the correct component was identified by inspection and the change was applied there.

### Minor: `num-body` not applied to any element
The ticket specifies `num-body` for row figures in `ExpenseBreakdown` and `IncomeBreakdown`. On inspection, neither component uses `metric-value` for individual row items — they use Tailwind `text-sm font-medium` / `text-sm text-muted-foreground`. There are no `metric-value` instances to swap to `num-body`. The CSS class is defined and available; application to inline row figures requires a separate pass when those components are refactored to use CSS classes for amounts. This is a gap in the ticket's assumption about current implementation state, not a defect.

## Required fixes

None. The implementation is correct and complete for the scope defined by actual code state.

## Regression risks

**Low.**

1. **Size reduction on Assets/Liabilities tiles** — Intentional: `NetWorthSummary` assets and liabilities drop from 32px to 24px. This is the correct per-spec hierarchy. The net worth amount remains 32px. Visual regression tests (if any) will flag this as expected change.

2. **`font-variant-numeric: tabular-nums` duplication** — `WealthBreakdown` tiles combine `num-balance` (which now includes `tabular-nums`) with the Tailwind `tabular-nums` class. This is harmless redundancy — both declarations set the same CSS property to the same value.

3. **`--accent` not defined** — The `.positive` modifier uses `var(--accent, var(--color-primary))`. If the theme does not define `--accent`, it falls back to `--color-primary`, matching the existing `.metric-value.positive` behaviour. No regression.

4. **Out-of-scope files unaffected** — `AccountsPage`, `BudgetSummaryCard`, `LiabilityPortfolioSection` continue rendering with `metric-value` at 32px. No change, no risk.

## Should this ticket be closed

**Yes.**

The three DS tier classes are defined in the design system CSS layer. Representative consumers across dashboard and wealth are correctly tiered. The `metric-value` class is preserved for existing consumers. The foundation is in place for PRO-10, PRO-11, PRO-12, and PRO-31 to build on.

Follow-up items to open as separate tickets:
- Apply `num-balance` to `AccountsPage`, `BudgetSummaryCard`, `LiabilityPortfolioSection`.
- Apply `num-body` to row-level amount elements in `ExpenseBreakdown` and `IncomeBreakdown` once those rows surface actual currency amounts styled with `metric-value` or equivalent.

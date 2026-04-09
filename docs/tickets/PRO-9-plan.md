# PRO-9 Plan — DS: Implement numeric display tiers num-display / num-balance / num-body

## Ticket intent

Add three semantic numeric display tier classes to the design system (`num-display`, `num-balance`, `num-body`) as defined in `design-system-v2.html` § Data display — "Numeric value display — size tiers". Apply the correct tier to representative dashboard and wealth consumers, replacing the one-size-fits-all `metric-value` usage with the tier appropriate to each amount's hierarchy level.

## Family plan reference

No family plan document linked. This is a DS foundation ticket; it defines the typographic contracts that PRO-10, PRO-11, PRO-12, and PRO-31 will rely on.

## Critique mapping

T2, DS-3 — Numeric size hierarchy inconsistency. All numeric amounts are currently rendered at 32px serif (`metric-value`), flattening the visual hierarchy. Net worth, section totals, and row figures share identical type treatment, making it impossible for users to quickly orient to the most important figure.

## Dependency assessment

No blockers. CSS variables `--serif`, `--font-family-sans`, `--color-primary`, and `--danger` already exist. This ticket is a foundation for:
- PRO-10 (card layout)
- PRO-11 (section totals)
- PRO-12 (inline row amounts)
- PRO-31 (budget row typography)

## Files/components to inspect first

### CSS
- `src/index.css` — `.metric-value` at line 390. Existing positive/negative modifiers at 399–405. No conflicts with proposed new class names.

### Components (all read before changing)
- `src/features/dashboard/components/NetWorthSummary.tsx` — **This is where the net worth amount actually renders**, despite the ticket listing `NetWorthCard.tsx`. NetWorthCard delegates the summary panel to NetWorthSummary. Net Worth tile uses `metric-value` with `positive`/`negative`. Assets and Liabilities also use `metric-value`.
- `src/features/dashboard/components/BudgetBreakdownTile.tsx` — Three metric tiles (income, expenses, surplus) using `metric-value`. Surplus uses `.positive`/`.negative` modifiers.
- `src/features/dashboard/components/ExpenseBreakdown.tsx` — One metric tile for total monthly expenses (`metric-value`). Individual category rows use Tailwind `text-sm` utilities, not `metric-value`.
- `src/features/dashboard/components/IncomeBreakdown.tsx` — One metric tile for total monthly income (`metric-value`). Individual income rows use Tailwind `text-sm` utilities, not `metric-value`.
- `src/features/wealth/components/WealthBreakdown.tsx` — Three metric tiles (Assets, Liabilities, Net Worth) using `metric-value`. Net Worth uses `.positive`/`.negative`.

### Out-of-scope consumers (deferred)
- `src/features/accounts/AccountsPage.tsx` — Account balance metric tile using `metric-value`.
- `src/features/budget/components/BudgetSummaryCard.tsx` — Four metric tiles using `metric-value`.
- `src/features/wealth/components/LiabilityPortfolioSection.tsx` — Total liabilities metric tile using `metric-value`.

## Proposed implementation path

### Step 1 — Add CSS tiers to `index.css`

After the `.metric-value.negative` block (line 405), insert:

```css
/* Numeric display tiers — DS v2 */
.num-display {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.num-balance {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 400;
  line-height: 1.25;
}

.num-body {
  font-family: var(--font-family-sans, 'DM Sans', sans-serif);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

.num-display.positive, .num-balance.positive, .num-body.positive {
  color: var(--accent, var(--color-primary));
}
.num-display.negative, .num-balance.negative, .num-body.negative {
  color: var(--danger);
}
```

### Step 2 — Apply tiers to components

| Component | Element | Old class | New class | Tier rationale |
|---|---|---|---|---|
| `NetWorthSummary.tsx` | Net Worth amount | `metric-value` | `num-display` | Hero dashboard figure |
| `NetWorthSummary.tsx` | Assets amount | `metric-value` | `num-balance` | Secondary card value |
| `NetWorthSummary.tsx` | Liabilities amount | `metric-value` | `num-balance` | Secondary card value |
| `BudgetBreakdownTile.tsx` | Income, Expenses, Surplus amounts | `metric-value` | `num-balance` | Section totals |
| `ExpenseBreakdown.tsx` | Total monthly expenses | `metric-value` | `num-balance` | Section total |
| `IncomeBreakdown.tsx` | Total monthly income | `metric-value` | `num-balance` | Section total |
| `WealthBreakdown.tsx` | Assets, Liabilities, Net Worth | `metric-value` | `num-balance` | Wealth page card values |

**Note on ExpenseBreakdown/IncomeBreakdown row figures:** The ticket specifies `num-body` for "row figures" in these components, but inspection shows individual category rows use Tailwind `text-sm` utilities rather than `metric-value`. There is no `metric-value` to swap on row items. The section total (`metric-value`) is correctly classified as `num-balance`. Row amounts will be candidates for `num-body` in a follow-up pass if Tailwind classes are refactored to CSS classes.

**Note on NetWorthCard.tsx:** The ticket targets this file, but `NetWorthCard` itself does not render the net worth amount — it delegates to `NetWorthSummary`. The change is applied to `NetWorthSummary`.

### Step 3 — Audit remaining `.metric-value` usages

Document which files still use `metric-value` post-change for follow-up tickets.

## Risks / regression watchouts

1. **`font-variant-numeric: tabular-nums`** — `.metric-value` includes this; the new tier classes do not. Components that depended on it via `metric-value` should add `tabular-nums` Tailwind class or ensure the class is combined. Check: `WealthBreakdown` and `AccountsPage` use `.metric-value.tabular-nums` compound (Tailwind class alongside). The new tier classes don't block tabular-nums — keep existing `tabular-nums` Tailwind classes in place where they exist.
2. **Color modifiers** — `.positive`/`.negative` modifiers on `metric-value` must carry over to new tier classes. The CSS spec adds combined selectors for all three tiers.
3. **`metric-value` is not removed** — existing consumers (AccountsPage, BudgetSummaryCard, LiabilityPortfolioSection) continue to work without change.
4. **`--accent` variable** — used as preferred colour for `.positive`. If `--accent` is not defined in the current theme, the fallback `var(--color-primary)` covers it. Matches existing `.metric-value.positive { color: var(--color-primary) }`.
5. **Size regression on NetWorthSummary assets/liabilities** — switching from 32px to 24px is intentional (correct tier), but visually reduces those two figures. This is the desired hierarchy change per spec.

## Validation checklist

- [ ] `num-display`, `num-balance`, `num-body` classes render correctly in browser.
- [ ] Net Worth amount in `NetWorthSummary` renders at 32px serif (num-display).
- [ ] Assets and Liabilities in `NetWorthSummary` render at 24px serif (num-balance).
- [ ] BudgetBreakdownTile income/expenses/surplus render at 24px serif (num-balance).
- [ ] ExpenseBreakdown total amount renders at 24px serif (num-balance).
- [ ] IncomeBreakdown total amount renders at 24px serif (num-balance).
- [ ] WealthBreakdown totals render at 24px serif (num-balance).
- [ ] `.positive` and `.negative` colour modifiers work on all three tier classes.
- [ ] Existing `metric-value` consumers not in scope are visually unchanged.
- [ ] No TypeScript or lint errors introduced.

## Implementation readiness

**Ready**

All required CSS variables exist. No API or data changes. Zero external dependencies. Files inspected and class targets confirmed.

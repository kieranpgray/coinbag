# PRO-24 — Review

## Review verdict

Pass

## What is correct

### CSS root fix
The `.metric-tile` CSS class in `src/index.css` was the authoritative source of the double-surface problem. Its `background: hsl(var(--card))` set a white-on-white background whenever a `.metric-tile` element sat inside a `<Card>` (which also uses `hsl(var(--card))`). Changing it to `background: var(--paper-2)` (`#f2f0eb`) at the class level is the correct, single-source fix. Every current and future use of `.metric-tile` now renders the intended inner tinted surface without requiring per-component overrides.

### Redundant Tailwind class removal
All five affected dashboard components (`NetWorthSummary`, `BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`) previously carried `rounded-[var(--rl)] border border-border bg-card px-6 py-5` as Tailwind overrides on the same element that used `.metric-tile`. These were entirely redundant with what the CSS class already provided. Their removal reduces noise without changing structure.

The `border border-border` in particular was the second border — the CSS class's `border: 1px solid var(--paper-3)` had a different (and more subtle) color than `border-border`, so the Tailwind override was producing the more aggressive outer-card-weight border on inner tiles. Removing it leaves only the hairline `var(--paper-3)` border — explicitly allowed by the DS spec as "hairline divider".

### NetWorthCard chart container
The chart wrapper div was not using `.metric-tile` but had its own `border border-border bg-card` pattern. Correctly changed to `bg-[var(--paper-2)]` with no border — appropriate since the chart container is a visual area rather than a data metric display, and the outer Card already defines the section boundary.

### Scope discipline
- `DashboardPage.tsx` untouched — `h1.page-title` from PRO-8 preserved.
- `AssetsBreakdown.tsx` and `LiabilitiesBreakdown.tsx` confirmed as having no inner metric tiles — correctly left unchanged.
- `SetupProgress` and placeholder cards left for PRO-26 and PRO-23 respectively.
- No data bindings, hook calls, loading states, or empty states modified.

### TypeScript
`tsc --noEmit` exits with code 0. No type errors introduced.

## What is off

### `.metric-tile` border is still present
The CSS class retains `border: 1px solid var(--paper-3)`. This is acceptable per DS spec (hairline divider) but could be revisited. `var(--paper-3)` = `#e8e5de` is subtle enough to not read as a second card border on light backgrounds. If future design review finds any residual "nested card" feel, the next step would be to remove this border entirely and rely solely on the background tint contrast.

### Chart container `bg-[var(--paper-2)]` visibility
The NetWorthCard chart wrapper now has `bg-[var(--paper-2)]` applied to it. The chart itself renders over this background. The Recharts/chart library may have its own background handling — if the chart's plot area is transparent, the `#f2f0eb` tint will show through, which is intentional and correct. However, if any chart element has a hardcoded white background, it could look mismatched. This should be verified visually.

## Required fixes

None. The implementation is correct and complete within ticket scope.

## Regression risks

**Low — contained to visual presentation only.**

- `.metric-tile` background change is global — affects `BudgetSummaryCard.tsx`, `WealthBreakdown.tsx`, `LiabilityPortfolioSection.tsx`, `AccountsPage.tsx` in addition to dashboard components. All of these should benefit from the same paper-2 tint when inside a Card, but they were not inspected in this ticket. Recommend a visual pass on those pages in the next session.
- NetWorthCard chart area may need a visual check if the chart library doesn't handle tinted backgrounds well.
- No logic, data, or state regressions possible — changes are purely CSS class names on presentation divs.

## Should this ticket be closed

Yes

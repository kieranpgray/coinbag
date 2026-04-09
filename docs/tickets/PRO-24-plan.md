# PRO-24 — Overview: Flatten card-in-card nesting; inner metrics without double borders

## Ticket intent

Remove the card-in-card visual pattern across all Overview (Dashboard) metric components. The current code wraps inner `.metric-tile` divs in `rounded-[var(--rl)] border border-border bg-card` — which, when sitting inside an outer `<Card>` (which also has a border + bg-card), produces a white-on-white double border surface. The DS specifies metric tiles should live on a subtle tinted inner surface (`bg-[var(--paper-2)]`) within one outer card shell, not nested inside a second bordered Card.

## Family plan reference

`/docs/plans/family-overview-layout.md` — PRO-24 is ticket 1 of 3 in the family. Must land before PRO-23 (placeholder cards) and PRO-26 (SetupProgress FAB) to avoid structural conflicts on DashboardPage.tsx.

## Critique mapping

- **T12** — `<Card>` wrapping `.metric-tile` = double border, double white background.
- **T3 adjacency** — Surface hierarchy violation: inner tiles visually equal-weight to outer card shell.
- **SC2** — Shared component pattern: metric tiles should read as content within a card, not as nested cards.

## Dependency assessment

No upstream blockers. PRO-8 (page titles) has merged and set `<h1 className="page-title">` in `DashboardPage.tsx` — do not revert. PRO-23 and PRO-26 are downstream of this ticket.

## Files/components to inspect first

| File | Card-in-card? | Action needed |
|------|--------------|---------------|
| `src/features/dashboard/DashboardPage.tsx` | N/A — orchestrator | Read only; confirm `h1.page-title` is present |
| `src/features/dashboard/components/NetWorthCard.tsx` | Yes — inner chart container div has `border border-border bg-card` inside outer `<Card>` | Remove border + bg-card from chart container; use `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/NetWorthSummary.tsx` | Yes — 3 metric tiles each have `border border-border bg-card` inside the Card provided by NetWorthCard | Replace with `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/BudgetBreakdownTile.tsx` | Yes — 3 inner metric divs have `border border-border bg-card` inside outer `<Card>` | Replace with `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/ExpenseBreakdown.tsx` | Yes — 1 metric summary div has `border border-border bg-card` inside outer `<Card>` | Replace with `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/IncomeBreakdown.tsx` | Yes — 1 metric summary div has `border border-border bg-card` inside outer `<Card>` | Replace with `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/MarketSummary.tsx` | Yes — S&P 500 metric div has `border border-border bg-card` inside outer `<Card>` | Replace with `bg-[var(--paper-2)]` |
| `src/features/dashboard/components/AssetsBreakdown.tsx` | No — outer `<Card>` contains only a donut chart + list, no inner bordered tiles | No change needed |
| `src/features/dashboard/components/LiabilitiesBreakdown.tsx` | No — same structure as AssetsBreakdown | No change needed |

## Proposed implementation path

### Uniform token swap

For every inner metric tile div that currently reads:
```
rounded-[var(--rl)] border border-border bg-card px-6 py-5 metric-tile
```
Change to:
```
rounded-[var(--rl)] bg-[var(--paper-2)] px-6 py-5 metric-tile
```

This removes `border border-border` (eliminates the second border) and swaps `bg-card` (white) for `bg-[var(--paper-2)]` (`#f2f0eb` — subtle off-white tint).

### NetWorthCard.tsx chart container (specific)

Line 220 has:
```
<div className="rounded-[var(--rl)] border border-border bg-card chart-container">
```
Change to:
```
<div className="rounded-[var(--rl)] bg-[var(--paper-2)] chart-container">
```

### Files changed
1. `NetWorthCard.tsx` — 1 div (chart container)
2. `NetWorthSummary.tsx` — 3 metric tile divs
3. `BudgetBreakdownTile.tsx` — 3 metric tile divs (in main render + loading and empty states are Card-only, no inner tiles)
4. `ExpenseBreakdown.tsx` — 1 metric tile div
5. `IncomeBreakdown.tsx` — 1 metric tile div
6. `MarketSummary.tsx` — 1 metric tile div

### Files confirmed as no-change
- `AssetsBreakdown.tsx` — no inner metric tiles; only card + chart + list
- `LiabilitiesBreakdown.tsx` — same
- `DashboardPage.tsx` — no structural changes; `h1.page-title` preserved

## Risks / regression watchouts

- The `chart-container` class in `NetWorthCard.tsx` may define additional CSS. Removing `bg-card` from it may expose `bg-[var(--paper-2)]` where the chart itself renders — verify visually that the chart background doesn't show the tint unexpectedly.
- The `metric-tile` class in `index.css` may independently supply border/background. If so, the class-level styles would conflict with the Tailwind overrides. Should inspect `index.css` for `.metric-tile` definition.
- Loading skeleton states in all components use `<Card>` with no inner metric tiles — they are unaffected.
- Empty states in all components use `<Card>` with only text + buttons — no inner tiles — unaffected.

## Validation checklist

- [ ] No two nested white bordered surfaces visible on any Overview card (NetWorth, Budget, Expenses, Income, Market).
- [ ] Each metric section has exactly one visual boundary (the outer Card).
- [ ] Inner metric tiles display `bg-[var(--paper-2)]` tint with no visible border.
- [ ] NetWorthCard chart area background does not disrupt chart readability.
- [ ] Loading states still render correctly (skeletons unaffected).
- [ ] Empty states still render correctly (no inner tiles → unaffected).
- [ ] `h1.page-title` in DashboardPage.tsx is untouched (PRO-8 preserved).
- [ ] No TypeScript errors introduced.
- [ ] AssetsBreakdown and LiabilitiesBreakdown visually unchanged.

## Implementation readiness

Ready

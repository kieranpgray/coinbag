# PRO-23 Plan — Overview: Remove placeholder cards (Latest News / Recent Transactions)

## Ticket intent

Remove the non-functional "Latest News" and "Recent Transactions" `<Card>` placeholder sections from `DashboardPage.tsx`. These cards render at full visual weight alongside functional metric tiles (Net Worth, Budget Breakdown), wasting user attention on sections with no real data. Removal is the preferred direction — cleaner signal/noise ratio, no visual debt.

## Family plan reference

`/Users/kierangray/Projects/wellthy/docs/plans/family-overview-layout.md`

PRO-23 is the second of three tickets in the Overview layout family (PRO-24 → PRO-23 → PRO-26). PRO-24 has completed. PRO-26 (SetupProgress replacement) must not be touched here.

## Critique mapping

- **T15** — Placeholder sections compete visually with meaningful data tiles.
- **SC1** — Full `<Card>` chrome for non-functional content is equal-weight to Net Worth and budget tiles; constitutes signal noise.

## Dependency assessment

- PRO-24: **Completed** — structural card flattening is done; DashboardPage.tsx structure is stable.
- PRO-26: **Not started** — SetupProgress is explicitly out of scope for this ticket.
- No other blockers.

## Files/components to inspect first

1. `src/features/dashboard/DashboardPage.tsx` — sole implementation target.

Observations from file inspection:

- **Lines 365–390:** A `grid grid-cols-1 md:grid-cols-2 gap-4` wrapper holds `<MarketSummary />` and a plain `<Card>` for "Latest News". The Latest News card has two branches: no holdings (shows CTA to add investment) and has holdings but no news.
- **Lines 392–405:** A standalone `<Card>` for "Recent Transactions" — always shows a single placeholder paragraph + "Add account" CTA.
- **Line 288:** `<h1 className="page-title">` — PRO-8 change, must be preserved.
- **Lines 303–308:** `<SetupProgress />` — PRO-26's territory, do not touch.
- Imports to clean up post-removal: `Card`, `CardContent`, `CardHeader`, `CardTitle` (used only in placeholder cards), `Link` (used only in placeholder cards), `ROUTES` (used only in placeholder cards). `Button` must be retained — it is also used in the error state (line 234).

## Proposed implementation path

1. **Remove "Latest News" card and collapse grid:**
   - The `grid grid-cols-1 md:grid-cols-2 gap-4` wrapper (lines 365–390) exists solely to pair `<MarketSummary />` with the Latest News card. With Latest News removed, `<MarketSummary />` should render full-width with no wrapper change needed — remove the grid div and render `<MarketSummary />` as a direct child of the outer `space-y-6` container.

2. **Remove "Recent Transactions" card:**
   - Delete lines 392–405 entirely.

3. **Clean up now-orphaned imports:**
   - Remove: `Card`, `CardContent`, `CardHeader`, `CardTitle` from `@/components/ui/card`.
   - Remove: `Link` from `react-router-dom`.
   - Remove: `ROUTES` from `@/lib/constants/routes`.
   - Retain: `Button` (used in error state), all other imports.

4. **Verify `hasHoldings` / `assetsCount` memo:**
   - `hasHoldings` (line 138) was used only in the Latest News conditional. After removal it becomes unused — remove the `const hasHoldings` line to keep the file clean.

## Risks / regression watchouts

- **Grid layout gap:** Removing Latest News leaves `<MarketSummary />` without a grid partner. Solution: remove the two-column grid wrapper, let MarketSummary be full-width (consistent with other standalone tiles like `<BudgetBreakdownTile />`).
- **Unused variable lint error:** `hasHoldings` will become unreferenced after removal — must delete to avoid a TypeScript/lint error.
- **Unused imports:** Orphaned imports will likely trigger lint warnings. Remove proactively.
- **PRO-8 regression:** `<h1 className="page-title">` must remain untouched.
- **PRO-26 regression:** `<SetupProgress />` block must remain untouched.
- **Error state:** `Button` is used in the error return path (line 234) — do not remove that import.

## Validation checklist

- [ ] "Latest News" card no longer renders anywhere on the Overview page.
- [ ] "Recent Transactions" card no longer renders anywhere on the Overview page.
- [ ] `<MarketSummary />` still renders, now full-width.
- [ ] No layout gap or visual break where the cards were.
- [ ] `<h1 className="page-title">` is intact (PRO-8).
- [ ] `<SetupProgress />` block is unchanged (PRO-26).
- [ ] No TypeScript or lint errors (unused vars/imports cleaned up).
- [ ] Loading state skeleton (`isLoading && !dashboardData` branch) is unaffected.
- [ ] Error state (`hasError` branch) still renders correctly with `Button`.
- [ ] Empty dashboard state (`isDashboardEmpty` → `<CardBasedFlow />`) is unaffected.

## Implementation readiness

**Ready** — PRO-24 complete, file structure understood, changes are surgical and low-risk.

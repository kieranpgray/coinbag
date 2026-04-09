# PRO-23 Review — Overview: Remove placeholder cards

## Review verdict

Pass

## What is correct

- **Both placeholder cards removed cleanly.** "Latest News" and "Recent Transactions" no longer appear anywhere in the JSX of `DashboardPage.tsx`.
- **`<MarketSummary />` preserved and promoted to full-width.** The two-column grid wrapper that paired `<MarketSummary />` with the Latest News card has been removed. MarketSummary now renders as a standalone full-width tile — consistent with `<BudgetBreakdownTile />` — and does not leave any layout gap.
- **`<h1 className="page-title">` intact.** PRO-8 change is preserved at line 284.
- **`<SetupProgress />` block untouched.** PRO-26's territory is not modified.
- **Orphaned imports cleaned up.** `Card`, `CardContent`, `CardHeader`, `CardTitle` (from `@/components/ui/card`), `Link` (from `react-router-dom`), and `ROUTES` (from `@/lib/constants/routes`) have all been removed.
- **`hasHoldings` memo removed.** The only usage was inside the deleted Latest News conditional; its removal prevents a TypeScript unused-variable error.
- **`Button` import retained.** Still required by the error state branch (`hasError` return) at line 230.
- **All functional metric tiles untouched:** `NetWorthCard`, `AssetsBreakdown`, `LiabilitiesBreakdown`, `BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, loading skeletons, error state, empty state (`CardBasedFlow`).
- **Sequencing respected.** PRO-24 was completed before this ticket; PRO-26 is deferred as specified.

## What is off

Nothing material. The changes are surgical and bounded exactly to the target sections.

Minor observation: `dataSources.holdingsCount` remains in the fallback object definition (line 104) and is still part of the `dataSources` shape. This is correct — it is a data property, not a derived memo, and its presence in the type/object does not cause a lint error.

## Required fixes

None.

## Regression risks

Low. Removed sections were non-functional placeholders with no data dependencies. No other component consumed the Latest News or Recent Transactions sections. The only structural change is `<MarketSummary />` becoming full-width, which is an intentional improvement and does not affect its data flow or loading states.

The one risk to monitor: if `MarketSummary` was visually designed assuming a constrained half-width column, it should be verified in the browser to ensure it renders well at full container width. This is a display concern, not a correctness concern.

## Should this ticket be closed

Yes

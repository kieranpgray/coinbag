# PRO-16 — DS: Typography weights — DM Sans 300–500 only; remove erroneous font-bold 700

**Type:** Spec deviation — DS weight rules  
**Status:** Ready to implement

---

## Ticket intent

Enforce the DM Sans weight ceiling of 500 across all UI components. Tailwind's `font-bold` compiles to `font-weight: 700` and `font-semibold` to `font-weight: 600` — both bypass the CSS token (`--font-weight-bold: 500`) and violate the design system spec. Every DM Sans text element carrying `font-bold` or `font-semibold` must be replaced with `font-medium` (weight 500). Instrument Serif headings and shadcn primitives are explicitly excluded.

---

## Family plan reference

`/docs/plans/family-typography.md` — PRO-16 is the first of two tickets in the typography wave. It must land before PRO-8 (serif page titles) to ensure h1 elements don't carry a Tailwind weight override when the serif class is applied.

---

## Critique mapping

- **T7** — Typography weight violations across DM Sans UI text
- **DS-9** — DM Sans must never exceed weight 500; token `--font-weight-bold` already correct at 500, leak is at call sites

---

## Dependency assessment

No upstream blockers. Foundation ticket. PRO-8 (serif page titles) should follow this ticket. PRO-13 (empty state serif) unblocked once PRO-8 lands.

---

## Files/components to inspect first

Audit result: **59 files** contain `font-bold` or `font-semibold`. Excluding `src/components/ui/` (shadcn) and test files.

Priority batch (highest user-facing impact):

**Dashboard** — 6 files:
- `src/features/dashboard/DashboardPage.tsx` — h1/h2 `font-bold` (3×)
- `src/features/dashboard/components/BudgetBreakdownTile.tsx` — h2 `font-semibold` (2×)
- `src/features/dashboard/components/NetWorthCard.tsx` — h2 `font-semibold` (2×)
- `src/features/dashboard/components/SummaryCard.tsx` — div `font-bold` (numeric value display)
- `src/features/dashboard/components/AssetAllocationList.tsx` — span/p `font-semibold` (2×)
- `src/features/dashboard/components/LiabilitiesAllocationList.tsx` — span/p `font-semibold` (2×)

**Wealth** — 7 files:
- `src/features/wealth/WealthPage.tsx` — h1 `font-bold`
- `src/features/wealth/components/AssetsSection.tsx` — h2 `font-semibold`, h3 `font-semibold`, span `font-bold`
- `src/features/wealth/components/AssetCategoryGroup.tsx` — h3 `font-semibold`, span `font-bold`
- `src/features/wealth/components/AssetPortfolioSection.tsx` — h2 `font-semibold`, h3 `font-semibold`
- `src/features/wealth/components/LiabilitiesSection.tsx` — h2 `font-semibold`, span `font-bold`
- `src/features/wealth/components/LiabilityCategoryGroup.tsx` — h3 `font-semibold`, span `font-bold`
- `src/features/wealth/components/LiabilityPortfolioSection.tsx` — h2 `font-semibold`

**Budget** — 5 files:
- `src/features/budget/BudgetPage.tsx` — h1 `font-bold`, span `font-semibold`
- `src/features/budget/components/BudgetBreakdown.tsx` — h2 `font-semibold`, spans `font-bold` (5×)
- `src/features/budget/components/ExpensesSection.tsx` — h2 `font-semibold`, span `font-bold`
- `src/features/budget/components/IncomeSection.tsx` — h2 `font-semibold`, span `font-bold`
- `src/features/budget/components/BudgetTopBar.tsx` — divs `font-semibold` (4×)

**Transfers** — 6 files:
- `src/features/transfers/TransfersPage.tsx` — h1 `font-bold` (3×)
- `src/features/transfers/components/AccountCashFlowRow.tsx` — `font-semibold`
- `src/features/transfers/components/TransferSuggestions.tsx` — h2/h3/span `font-semibold` (7×)
- `src/features/transfers/components/CashFlowSummary.tsx` — summary/h2 `font-semibold`
- `src/features/transfers/components/TransferSuggestionRow.tsx` — div `font-bold` (numeric amount)
- `src/features/transfers/components/AccountBreakdownModal.tsx` — span `font-semibold` (2×), `font-bold`

**Layout** — 1 file:
- `src/components/layout/Sidebar.tsx` — span `font-bold` (logo "S" monogram)

---

## Proposed implementation path

1. Replace all `font-semibold` → `font-medium` on DM Sans text (h1–h3, labels, metadata, section headings, numeric spans, summary rows, nav labels).
2. Replace all `font-bold` → `font-medium` on DM Sans text (same categories).
3. **Skip:** Instrument Serif headings (none found in scope — PRO-8 not yet applied).
4. **Skip:** `src/components/ui/` shadcn primitives.
5. **Skip:** test files.
6. Document remaining ~34 files for follow-up.

---

## Risks / regression watchouts

- **Button text:** Buttons using shadcn's `<Button>` inherit weight from shadcn styles — those are in `src/components/ui/` and are intentionally excluded.
- **Numeric amounts:** `font-bold` on tabular-nums spans is still a violation — DM Sans weight must not exceed 500 even for monetary figures. Replace with `font-medium`.
- **Page titles (h1):** These will be converted to Instrument Serif in PRO-8. Replacing `font-bold` with `font-medium` now is correct — it prevents the 700 weight from bleeding into the serif treatment.
- **Synthetic bold on serif:** Instrument Serif only ships weight 400; browser synthetic bold looks broken. However no serif elements appear in scope for this ticket.
- **Label contrast:** Dropping from 700→500 may reduce perceived emphasis. Verify buttons, section titles, and stat labels retain visual distinctiveness at 500.

---

## Validation checklist

- [ ] `grep -r "font-bold\|font-semibold" src/features/dashboard src/features/wealth src/features/budget src/features/transfers src/components/layout` returns zero results after fix
- [ ] Browser devtools: no DM Sans text renders at computed `font-weight: 600` or `700` on Dashboard, Wealth, Budget, Transfers pages
- [ ] Section headings (h2, h3) still visually distinct from body text (size + medium weight sufficient)
- [ ] Numeric values (portfolio totals, budget amounts) legible at weight 500
- [ ] Sidebar logo letter "S" renders at 500
- [ ] No TypeScript or lint errors introduced

---

## Implementation readiness

**Ready**

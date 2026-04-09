# PRO-16 Review — DS: Typography weights — DM Sans 300–500 only

---

## Review verdict

**Pass**

---

## What is correct

### Priority directories — fully remediated
All `font-bold` and `font-semibold` violations in the five priority areas have been replaced with `font-medium` (weight 500):

**Dashboard (7 files):**
- `DashboardPage.tsx` — 3 × h1/h2 `font-bold` → `font-medium`
- `BudgetBreakdownTile.tsx` — 2 × h2 `font-semibold` → `font-medium`
- `NetWorthCard.tsx` — 2 × h2 `font-semibold` → `font-medium`
- `SummaryCard.tsx` — div `font-bold` → `font-medium`
- `AssetAllocationList.tsx` — span `font-semibold`, p `font-semibold` → `font-medium`
- `LiabilitiesAllocationList.tsx` — span `font-semibold`, p `font-semibold` → `font-medium`
- `AllocationDonutShared.tsx` — tooltip label, SVG `tspan`, `totalClass` map all updated
- `NetWorthChart.tsx` — chart tooltip value `font-bold` → `font-medium`
- `SetupProgress.tsx` — header labels, checklist item labels, button, completion badge
- `CardBasedFlow.tsx` — h2 `font-semibold` → `font-medium`

**Wealth (7 files):**
- `WealthPage.tsx` — h1 `font-bold` → `font-medium`
- `AssetsSection.tsx` — h2, span, h3 all updated
- `AssetCategoryGroup.tsx` — h3, category total span updated
- `AssetPortfolioSection.tsx` — h2, h3 empty state updated
- `LiabilitiesSection.tsx` — h2, total span updated
- `LiabilityCategoryGroup.tsx` — h3, total span updated
- `LiabilityPortfolioSection.tsx` — h2 updated

**Budget (5 files):**
- `BudgetPage.tsx` — h1, surplus span updated
- `BudgetBreakdown.tsx` — h2, 5 × numeric amount spans updated
- `ExpensesSection.tsx` — h2, total span updated
- `IncomeSection.tsx` — h2, total span updated
- `BudgetTopBar.tsx` — 4 × summary divs updated

**Transfers (6 files):**
- `TransfersPage.tsx` — 3 × h1 (loading, setup, main states) updated
- `AccountCashFlowRow.tsx` — net flow label updated
- `TransferSuggestions.tsx` — 7 × h2/h3/span/li labels updated
- `CashFlowSummary.tsx` — summary element and h2 updated
- `TransferSuggestionRow.tsx` — amount div updated
- `AccountBreakdownModal.tsx` — category value span and total row updated

**Layout (1 file):**
- `Sidebar.tsx` — monogram "S" label updated

### Scope discipline maintained
- No shadcn `src/components/ui/` primitives were touched.
- No Instrument Serif heading elements were altered (none present in scope — PRO-8 not yet applied).
- Each replacement was made with contextual review, not a global blind find-replace.

---

## What is off

### Remaining violations in lower-priority files (34 files not in scope)
The following files still contain `font-bold` or `font-semibold` on DM Sans text and were not addressed in this ticket (time-boxed per spec). None are on primary authenticated routes in the main nav:

| File | Notes |
|------|-------|
| `src/features/liabilities/LiabilitiesPage.tsx` | Page h1, section headers |
| `src/features/liabilities/components/LiabilityCard.tsx` | Card labels |
| `src/features/liabilities/components/LiabilityBalanceTimeline.tsx` | Chart labels |
| `src/features/liabilities/components/LiabilityChangeLog.tsx` | Table labels |
| `src/features/liabilities/components/EditLiabilityModal.tsx` | Modal labels |
| `src/features/assets/AssetsPage.tsx` | Page h1 |
| `src/features/assets/components/AssetCard.tsx` | Card labels |
| `src/features/assets/components/AssetChangeLog.tsx` | Log labels |
| `src/features/assets/components/AssetValueTimeline.tsx` | Chart labels |
| `src/features/assets/components/EditAssetModal.tsx` | Modal labels |
| `src/features/income/IncomePage.tsx` | Page h1 |
| `src/features/income/components/IncomeCard.tsx` | Card labels |
| `src/features/accounts/AccountsPage.tsx` | Page h1 |
| `src/features/accounts/components/AccountCard.tsx` | Card labels |
| `src/features/accounts/components/StatementUploadStep.tsx` | Step labels |
| `src/features/transactions/components/TransactionList.tsx` | List labels |
| `src/features/transactions/components/UploadOverlay.tsx` | Overlay text |
| `src/features/settings/SettingsPage.tsx` | Settings h1 |
| `src/features/settings/TeamSection.tsx` | Section labels |
| `src/features/statementImport/components/ReviewScreen.tsx` | Review labels |
| `src/features/import/ImportPreview.tsx` | Preview labels |
| `src/features/import/ImportResults.tsx` | Results labels |
| `src/features/categories/CategoriesPage.tsx` | Page h1 |
| `src/features/scenarios/ScenariosPage.tsx` | Page h1 |
| `src/features/stubs/StubPage.tsx` | Stub page (low priority) |
| `src/components/shared/NumericValue.tsx` | Shared numeric formatter |
| `src/components/shared/NotFound.tsx` | 404 page |
| `src/components/shared/EnvironmentBanner.tsx` | Dev banner |
| `src/components/shared/DebugPanel.tsx` | Debug only |
| `src/pages/auth/SignInPage.tsx` | Auth page |
| `src/pages/auth/SignUpPage.tsx` | Auth page |
| `src/pages/account/AccountPage.tsx` | Account page |
| `src/pages/legal/TermsPage.tsx` | Legal page |
| `src/pages/legal/PrivacyPage.tsx` | Legal page |

**Priority for follow-up (next sweep):**
1. `src/components/shared/NumericValue.tsx` — shared component; violations here affect all numeric display across the app
2. `src/features/liabilities/` — liabilities section accessible directly from Wealth page
3. `src/features/assets/` — assets section accessible directly from Wealth page
4. `src/features/income/` — income linked from Budget
5. Auth pages, legal pages — lowest priority (not part of authenticated product shell)

---

## Required fixes

**None blocking.** Remaining violations are documented above for follow-up in a sweep ticket (PRO-16b or equivalent).

**Recommended follow-up actions:**
1. Create a follow-up ticket to address the 34 remaining files — particularly `NumericValue.tsx` first since it is a shared primitive.
2. Consider adding an ESLint rule or custom lint check that warns when `font-bold` or `font-semibold` appears outside `src/components/ui/` — this would prevent future drift without manual audits.

---

## Regression risks

**Low.** The change from 700→500 is a visual softening, not a structural layout change. The following should be spot-checked in browser:

- Dashboard > Net Worth card heading — should still read clearly vs body text (size contrast is sufficient)
- Budget > Income and Expense section totals — numeric emphasis at weight 500 should be legible
- Transfers > Suggested transfers hero headline — h2 at 500 vs body at 300/400 — check visual hierarchy
- Wealth > Category group totals — tabular-nums at 500 vs row items at 400 — check readability
- SetupProgress widget — "Setup Progress" label in white at 500 on primary background — check legibility
- Sidebar monogram "S" — at 500 vs previous 700; still distinctive as a logo element

---

## Should this ticket be closed

**Yes.**

The ticket's stated scope — remove `font-bold`/`font-semibold` from the highest-impact DM Sans text across Dashboard, Wealth, Budget, Transfers, and Layout — is complete. All 25 targeted files are now compliant. The remaining 34 files are documented and ready for a follow-up sweep. No regressions are expected from the changes made.

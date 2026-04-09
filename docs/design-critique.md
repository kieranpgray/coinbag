# Supafolio UI Design Critique

## Preamble

This review assesses four primary screens (Overview, Holdings, Recurring, Allocate) against seven standard critique dimensions, the provided reference direction, a design craft lens, and --- critically --- the project's own design system specification at `public/design-system-v2.html`.

The design system HTML is a substantial, opinionated document covering tokens, typography, cards, allocation rows, empty states, the authenticated shell, mobile tab bar, numeric display tiers, data tables, and interaction patterns. Many of the issues identified in this critique are not missing design direction --- they are **spec deviations**: patterns that have been designed and documented but not implemented. The critique distinguishes clearly between these two categories throughout.

**Convention used in this document:**

- **SPEC DEVIATION** --- the design system HTML already prescribes the correct pattern; the implementation diverges.
- **DESIGN GAP** --- no existing spec covers this; new design work is needed.

---

## 1. Screen Inventory

### Overview

- **Route:** `/app`, `/app/dashboard`
- **Primary file:** `src/features/dashboard/DashboardPage.tsx`
- **Key components:** `NetWorthCard`, `BudgetBreakdownTile`, `AssetsBreakdown`, `LiabilitiesBreakdown`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`, `SetupProgress`, `CardBasedFlow`
- **User task:** Understand financial position at a glance. The primary answer is net worth; the secondary answers are asset/liability composition and monthly cash flow.
- **Shared dependencies:** `Card`, `Skeleton`, `Alert`, `Button`, `Tabs`, `.metric-tile` CSS class, `PrivacyWrapper`, `StatusIndicator`, `NetWorthChart` (Recharts)

### Holdings

- **Route:** `/app/wealth`
- **Primary file:** `src/features/wealth/WealthPage.tsx`
- **Key components:** `WealthBreakdown`, `AssetsSection` / `AssetPortfolioSection`, `AssetCategoryGroup`, `AssetPortfolioRow`, `LiabilitiesSection` / `LiabilityPortfolioSection`
- **User task:** Audit all owned assets and owed liabilities by type. Edit or add items.
- **Shared dependencies:** `Card`, `Button`, `DropdownMenu`, `VisualDivider`, `.metric-tile`, `StatusIndicator`

### Recurring

- **Route:** `/app/budget`
- **Primary file:** `src/features/budget/BudgetPage.tsx`
- **Key components:** `BudgetBreakdown`, `IncomeSection` / `IncomeList`, `ExpensesSection` / `ExpenseList`, `VisualDivider`
- **User task:** View and manage recurring income and expenses. Understand the monthly surplus.
- **Shared dependencies:** `Card`, `Select`, `Tabs`, `Button`, `Alert`, `Dialog` (income CRUD), `CreateExpenseModal`, `EditExpenseModal`, `DeleteExpenseDialog`

### Allocate

- **Route:** `/app/transfers`
- **Primary file:** `src/features/transfers/TransfersPage.tsx`
- **Key components:** `PayCycleSetup`, `CashFlowSummary`, `TransferSuggestions`, `TransferSuggestionRow`, `UnallocatedWarning`
- **User task:** See what money to move and where on payday. Act on transfer suggestions.
- **Shared dependencies:** `Card`, `Select`, `Alert`, `Skeleton`, `Dialog` (edit pay cycle), native `<details>`/`<summary>`

---

## 2. Design System Spec vs Implementation: Key Deviations

Before examining individual screens, a summary of the most significant deviations between `public/design-system-v2.html` and the current codebase. These are not new recommendations --- they are decisions already made in the spec that were not carried through to implementation.

### DS-1: Page titles should use Instrument Serif (SPEC DEVIATION)

The authenticated shell spec defines: `.page-title { font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em; }`. Every page in the implementation uses DM Sans via `text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold` (which resolves to the sans stack). The serif is the product's intended typographic voice for headings --- it is imported, loaded, documented, and unused for page titles.

- **Spec reference:** `design-system-v2.html` #authenticated, `.page-title`
- **Implementation:** `DashboardPage.tsx`, `WealthPage.tsx`, `BudgetPage.tsx`, `TransfersPage.tsx` --- all `<h1>` elements

### DS-2: Mobile should use a fixed bottom tab bar, not a hamburger drawer (SPEC DEVIATION)

The design system explicitly specs a fixed bottom tab bar (`.tab-bar`, 56px height, 5 items: Overview, Holdings, Allocate, Recurring, More). Allocate is positioned at centre (position 3) for thumb reach. The comment states: "Show 5 items: Overview, Holdings, Allocate, Recurring, More --- Allocate in position 3 (centre) --- most-used feature gets prime thumb position."

The implementation uses a hamburger icon in `Header.tsx` that opens a full-screen `MobileNav` slide-over drawer via a `<Dialog>`.

- **Spec reference:** `design-system-v2.html` #authenticated, "Mobile --- bottom tab bar"
- **Implementation:** `src/components/layout/Header.tsx`, `src/components/layout/MobileNav.tsx`

### DS-3: Three numeric display tiers are defined; only one is implemented (SPEC DEVIATION)

The design system defines three tiers of numeric display:

- `num-display` --- serif 32px, for display/hero amounts
- `num-balance` --- serif 24px, for secondary amounts and card values
- `num-body` --- sans 15px weight-500, for inline/row amounts

The spec note states: "Serif for display/balance (emotional impact). Sans for inline row values (density)."

The implementation uses `.metric-value` (serif 32px) for all values --- from net worth to market data to budget rows --- flattening the tiered hierarchy into a single treatment.

- **Spec reference:** `design-system-v2.html` #data-display-extended, "Numeric value display --- size tiers"
- **Implementation:** `.metric-value` in `index.css`, used uniformly in `BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`, `WealthBreakdown`

### DS-4: The income card is a specific dark-green pattern (SPEC DEVIATION)

The design system defines `.income-card` as: `background: var(--accent); border-radius: var(--rl); padding: 16px; color: #fff;` with `.income-amount` in serif 30px white. This is the hero card visible in the reference image --- dark green background, white text, serif number.

The implementation uses a generic white `<Card>` with nested `.metric-tile` sub-cards (white-on-white) for `BudgetBreakdownTile` on Overview, and plain `text-body-lg font-bold` rows in `BudgetBreakdown` on Recurring. Neither screen uses the prescribed dark-green income card.

- **Spec reference:** `design-system-v2.html` #cards, "Income card (Allocate hero)"
- **Implementation:** `BudgetBreakdownTile.tsx`, `BudgetBreakdown.tsx`

### DS-5: The surplus card uses accent-light background, not a generic row (SPEC DEVIATION)

The design system defines `.surplus-card` as: `background: var(--accent-light); border: 1px solid rgba(26,92,58,0.15); border-radius: var(--rl);` with `.surplus-amount` in serif 22px, `color: var(--accent)`.

The implementation treats the surplus as a flat row in `BudgetBreakdown` (same styling as every other row) or a `bg-muted/30` strip in `BudgetPage`. Neither uses the prescribed accent-light card.

- **Spec reference:** `design-system-v2.html` #cards, "Allocation row" (surplus-card)
- **Implementation:** `BudgetBreakdown.tsx`, `BudgetPage.tsx`

### DS-6: Allocation rows have a defined component pattern (SPEC DEVIATION)

The design system defines `.alloc-row` with icon, name, account sublabel, amount, and optional progress bar. The Allocate screen's `TransferSuggestionRow` and `TransferSuggestions` do not follow this pattern --- they use their own ad-hoc layout.

- **Spec reference:** `design-system-v2.html` #cards, "Allocation row"
- **Implementation:** `TransferSuggestionRow.tsx`, `TransferSuggestions.tsx`

### DS-7: Empty states should use serif for the title (SPEC DEVIATION)

The design system defines `.empty-state-title { font-family: var(--serif); font-size: 20px; }` and explicitly states: "Never use 'No results' or 'Nothing here' --- use the copy from the feature copy doc."

The implementation uses DM Sans for all empty state titles. Copy like "Add your first asset to see a breakdown" describes absence rather than previewing value.

- **Spec reference:** `design-system-v2.html` #empty-states
- **Implementation:** All breakdown tiles in `DashboardPage.tsx`, `WealthPage.tsx`, `BudgetPage.tsx`

### DS-8: Negative surplus state already has visual guidance (SPEC DEVIATION)

The design system's "States pending visual design" table prescribes: "Negative surplus --- Surplus amount in `var(--danger)`. Alert banner above plan using `alert-danger`. Destination prompt hidden."

The implementation's shortfall state on Allocate uses a 12px uppercase `SectionLabel` with `text-destructive` --- no alert banner, no hidden destination prompt.

- **Spec reference:** `design-system-v2.html` #authenticated, "States pending visual design" table
- **Implementation:** `TransferSuggestions.tsx` (shortfall branch)

### DS-9: DM Sans weight range is 300-500, never 600 or 700 (SPEC DEVIATION)

The design system states: "Weight rules: DM Sans ships at 300 (light), 400 (regular), 500 (medium). Use 300 for body copy and card text, 400 for UI labels and metadata, 500 for headings-in-sans, button labels, and emphasis. Never use 600 or 700."

The implementation defines `--font-weight-bold: 500` and `--font-weight-semibold: 500` (both resolving to the same weight). However, many components add Tailwind's `font-bold` utility class which resolves to 700 --- directly contradicting the design system's weight rule. The two tokens being identical at 500 was likely intentional per the DS spec (where 500 is the max), but the Tailwind `font-bold` class overriding to 700 is an uncontrolled leak.

- **Spec reference:** `design-system-v2.html` #typography, "Weight rules"
- **Implementation:** `index.css` (lines 102-105), various components using `font-bold`

### DS-10: Sidebar width spec is 220px; implementation uses 192px (SPEC DEVIATION)

The design system defines `--shell-sidebar-w: 220px`. The implementation defines `--sidebar-width: 12rem` (192px) in `index.css`, and the actual sidebar uses Tailwind classes (`w-48` = 192px expanded, `w-14` = 56px collapsed).

- **Spec reference:** `design-system-v2.html` tokens, `--shell-sidebar-w: 220px`
- **Implementation:** `index.css` (line 17), `Sidebar.tsx` (`w-48`)

### DS-11: Inline edit mode for Allocate is specced but not implemented (SPEC DEVIATION)

The design system defines an inline edit mode for Allocate: "Adjusting your plan" badge in header, allocation row amounts become compact currency inputs, "Update plan" primary + "Cancel" ghost actions.

The implementation uses a modal dialog for editing the pay cycle. No inline edit mode exists for allocation amounts.

- **Spec reference:** `design-system-v2.html` #advanced-patterns, "Inline edit mode"
- **Implementation:** `TransfersPage.tsx` (uses `Dialog` for edit)

---

## 3. Aesthetic Identity Assessment

The design system document *does* define a clear aesthetic identity. The tokens section prescribes: Instrument Serif for headings and display numbers. DM Sans at 300-500 for UI text. A warm paper/ink colour system with forest green accent used selectively. Three numeric tiers. An income card in dark green. A surplus card in accent-light.

The problem is not that Supafolio lacks a design identity. The problem is that the documented identity has not been implemented. The DS spec would produce a product that looks and feels close to the reference image. The codebase produces a product that looks like a shadcn starter kit with green accent colour.

Specific gaps between documented identity and implemented reality:

- **Typography:** The spec uses Instrument Serif for page titles, card headings, display numbers, empty state titles, and income amounts. The implementation uses DM Sans for almost everything, with Instrument Serif appearing only in `.metric-value` at 32px and the sidebar wordmark. The serif is the product's voice in the spec; it is a footnote in the implementation.
- **Numeric hierarchy:** The spec defines three tiers (display/balance/body). The implementation has one (metric-value).
- **Card variants:** The spec defines three card variants (default, large, accent) plus the income-card and surplus-card patterns. The implementation uses `default` for everything.
- **Weight system:** The spec prescribes 300 for body, 400 for labels, 500 for emphasis --- a refined, light typographic feel. The implementation frequently adds `font-bold` (700) which produces a heavier, more generic result.
- **Mobile navigation:** The spec defines a thumb-optimised bottom tab bar. The implementation uses a hamburger drawer.

---

## 4. Per-Screen Critique

---

### Overview

#### Scorecard


| Dimension                 | Score |
| ------------------------- | ----- |
| Hierarchy                 | 2/5   |
| Scanability               | 2/5   |
| Affordance                | 3/5   |
| Design system consistency | 1/5   |
| Visual rhythm             | 1/5   |
| State coverage            | 3/5   |
| Responsiveness / mobile   | 2/5   |


Design system consistency drops to 1/5 because the Overview screen deviates from more documented spec patterns than any other screen.

#### What Works

- `NetWorthCard` occupying the full-width hero position is structurally correct. Net worth is the right primary answer.
- `AssetsBreakdown` and `LiabilitiesBreakdown` in a two-column grid establishes a natural comparison reading.
- `PrivacyModeToggle` and `ManualRefreshButton` are tucked into the header as secondary actions, not competing with content.
- All tiles include differentiated empty states with CTA links.
- The `metric-tile` CSS class itself closely matches the DS spec's metric/stat tile pattern --- the problem is not the pattern but its universal application.

#### Key Issues

**1. Page title uses sans instead of serif (SPEC DEVIATION)**

The `<h1>` renders in DM Sans via `text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold`. The DS spec defines `.page-title { font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em; }`. This is the single most visible divergence from the intended typographic identity on the product's anchor screen.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-1)
- **File:** `DashboardPage.tsx` (`<h1>` element)
- **Direction:** Apply `font-serif text-[28px] tracking-[-0.02em]` or equivalent token. This is not a new design decision --- it is implementing the existing one.

**2. All numeric values use the same `metric-value` tier (SPEC DEVIATION)**

The DS spec defines three tiers: `num-display` (serif 32px), `num-balance` (serif 24px), `num-body` (sans 15px 500). The implementation uses `.metric-value` (serif 32px) for net worth, total assets, total liabilities, income total, expenses total, market S&P 500 data, and budget summary values --- 8+ instances at identical visual weight.

Net worth and the S&P 500 1D change should not share a display tier. The spec already solves this.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-3)
- **Files:** `BudgetBreakdownTile.tsx`, `ExpenseBreakdown.tsx`, `IncomeBreakdown.tsx`, `MarketSummary.tsx`
- **Direction:** Apply `num-display` only to net worth. Use `num-balance` for section totals (income, expenses, asset allocation total). Use `num-body` for market data and row-level values.

**3. BudgetBreakdownTile uses generic white cards instead of income-card / surplus-card (SPEC DEVIATION)**

The DS spec defines `.income-card` (dark green bg, white serif number) and `.surplus-card` (accent-light bg, serif number in accent). `BudgetBreakdownTile` renders three identical white `.metric-tile` sub-cards inside a white `<Card>`. The income hero value and the surplus value are visually indistinguishable from each other and from the expenses value.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-4, DS-5)
- **File:** `BudgetBreakdownTile.tsx`
- **Direction:** Render income arriving using the `.income-card` pattern. Render surplus using the `.surplus-card` pattern. Render committed expenses as a standard metric-tile or a `num-balance` row. Three distinct treatments, all already documented.

**4. Card-within-card nesting throughout the page (DESIGN GAP)**

`BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`, and `NetWorthCard` nest `.metric-tile` divs inside `<Card>` components. Both surfaces resolve to white (`hsl(var(--card))`). The DS spec defines metric-tiles as standalone components, not as sub-cards nested inside other cards. The spec shows metric tiles in a flat grid --- not inside wrapping cards.

- **Severity:** High
- **Type:** DESIGN GAP (the spec doesn't prohibit nesting, but the examples never show it)
- **Files:** `NetWorthCard.tsx`, `BudgetBreakdownTile.tsx`, `ExpenseBreakdown.tsx`, `IncomeBreakdown.tsx`, `MarketSummary.tsx`
- **Direction:** Flatten. Metric tiles should be content within a card (using `bg-[var(--paper-2)]` for subtle surface distinction) or standalone blocks without an outer card wrapper.

**5. `space-y-6` creates the densest screen; spacing is uniform (DESIGN GAP)**

Overview uses `space-y-6` (24px) between all sections. Other screens use `space-y-12` (48px). The DS spacing table defines tokens from `--sp-1` (4px) through `--sp-20` (80px) --- a varied scale intended for varied rhythm. The implementation uses a single gap value uniformly.

- **Severity:** High
- **Type:** DESIGN GAP
- **File:** `DashboardPage.tsx` (outermost `<div className="space-y-6">`)
- **Direction:** Use varied spacing per the DS scale: `--sp-3` (12px) between conceptual siblings (Assets + Liabilities pair), `--sp-12` (48px) between major topic shifts (Net Worth section vs Cash Flow section vs Market section). The DS section padding guidance ("Section header margin-bottom: `--sp-12`") also suggests 48px as the natural inter-section gap.

**6. Placeholder cards at equal visual weight to functional tiles (DESIGN GAP)**

"Latest News" and "Recent Transactions" are full `<Card>` components with empty-state copy. They sit at the same visual level as net worth.

- **Severity:** High
- **Type:** DESIGN GAP
- **File:** `DashboardPage.tsx` (lines ~317--347)
- **Direction:** Remove until functional, or collapse to a single-line link row. The DS spec's empty state pattern (`.empty-state`) is appropriate for section-level empty states, not for placeholder sections that have no functional backing.

**7. Empty state titles use sans instead of serif (SPEC DEVIATION)**

The DS spec defines `.empty-state-title { font-family: var(--serif); font-size: 20px; }`. All empty state titles in the implementation use DM Sans.

- **Severity:** Medium
- **Type:** SPEC DEVIATION (DS-7)
- **Files:** All breakdown tile components on Overview
- **Direction:** Apply `font-serif text-[20px]` to empty state headings. Also audit copy: the DS says "Never use 'No results' or 'Nothing here'" --- current copy like "Add your first asset to see a breakdown" is close to this anti-pattern.

**8. SetupProgress FAB: constant animation at rest (DESIGN GAP)**

`SetupProgress` renders a fixed FAB with `animate-ping`. No equivalent pattern exists in the DS spec. The DS spec's approach to progress/state is inline (badges, progress bars, circular progress) --- never a floating overlay with animation.

- **Severity:** High
- **Type:** DESIGN GAP
- **File:** `SetupProgress.tsx`
- **Direction:** Replace with an inline dismissible progress row within Overview's body. The DS defines circular progress, progress bars, and step indicators --- any of these would be more appropriate than a permanently animated FAB.

**9. Loading skeleton doesn't match the populated layout (SPEC DEVIATION)**

The DS spec states for table loading: "Replace each cell content with a skeleton block matched to the expected content width. Header row remains visible. Never show a spinner over a table." The same principle applies to page-level loading: skeleton structure should match populated structure.

The Overview skeleton renders `grid-cols-4` with four `h-32` blocks. The populated page is a full-width hero, two-column pairs, and full-width tiles --- a completely different composition.

- **Severity:** Medium
- **Type:** SPEC DEVIATION (structural principle)
- **File:** `DashboardPage.tsx` (lines ~188--198)
- **Direction:** Match skeleton to actual grid: full-width tall block, two half-width blocks, full-width block.

#### Alignment to Target Direction

**Misaligned.** The reference direction is close to what the DS spec prescribes --- and the implementation deviates from both. If the DS spec were implemented faithfully (serif page titles, income-card pattern, surplus-card pattern, three numeric tiers), Overview would be significantly closer to the reference than it is today. The distance is not a design problem --- it is an implementation gap.

---

### Holdings

#### Scorecard


| Dimension                 | Score |
| ------------------------- | ----- |
| Hierarchy                 | 3/5   |
| Scanability               | 3/5   |
| Affordance                | 3/5   |
| Design system consistency | 3/5   |
| Visual rhythm             | 3/5   |
| State coverage            | 3/5   |
| Responsiveness / mobile   | 3/5   |


#### What Works

- `AssetPortfolioSection` grouping by category (header, row list, subtotal) is the clearest information pattern across all four screens.
- `AssetPortfolioRow` freshness timestamps and stale/broken connection indicators are well-considered data integrity signals.
- `VisualDivider` between Assets and Liabilities is a clean thematic break.
- `WealthBreakdown` (three metric-tiles in a row) matches the DS spec's metric/stat tiles pattern.
- Row items are interactive (`button` elements with `hover:bg-muted/50`).

#### Key Issues

**1. Page title uses sans instead of serif (SPEC DEVIATION)**

Same as Overview. The `<h1>` uses DM Sans. The DS spec prescribes Instrument Serif at 28px.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-1)
- **File:** `WealthPage.tsx`

**2. Total Assets displayed twice on the same screen (DESIGN GAP)**

`WealthBreakdown` shows Assets in a metric-tile. `AssetPortfolioSection` renders a second metric-tile with the same value directly below. Same number, same visual treatment, ~100px apart.

- **Severity:** High
- **Type:** DESIGN GAP
- **Files:** `WealthBreakdown.tsx`, `AssetPortfolioSection.tsx` (lines ~102--108)
- **Direction:** Remove the metric-tile from `AssetPortfolioSection`. The section heading is sufficient identification.

**3. Category icon badges create a repeating accent pattern (DESIGN GAP)**

Each `AssetCategoryGroup` renders a 32px `bg-primary/10` icon container with a Lucide icon. The DS spec defines icon containers at three sizes (28/36/40px) with specific backgrounds (`icon-bg-green`, `icon-bg-paper`, `icon-bg-dark`). The implementation's `bg-primary/10` doesn't match any DS-defined icon background. With 7--8 categories visible, the repeating green badges contradict selective accent use.

- **Severity:** Medium
- **Type:** DESIGN GAP (icon containers exist in the DS but are not prescribed for category group headers)
- **File:** `AssetCategoryGroup.tsx` (lines ~61--64)
- **Direction:** Remove the icon containers or use the DS-defined `icon-container-sm` (28px) with `icon-bg-paper` (paper-2 bg + paper-3 border) for a subtler treatment. The current `bg-primary/10` is not a DS token.

**4. Category grid produces inconsistent column heights at md breakpoint (DESIGN GAP)**

Categories with different item counts produce ragged column heights in the 2-column grid.

- **Severity:** Medium
- **Type:** DESIGN GAP
- **File:** `AssetPortfolioSection.tsx`
- **Direction:** Single-column layout for category groups. The DS authenticated shell spec shows linear vertical stacking, not a mosaic grid.

**5. Error state doesn't propagate to breakdown totals (DESIGN GAP)**

The DS spec's "States pending visual design" table mentions sync error states (status-dot-red + alert-warning inline). When `assetsError` is truthy, `WealthBreakdown` still shows values with no unreliable indicator.

- **Severity:** Medium
- **Type:** DESIGN GAP
- **File:** `WealthPage.tsx` (lines ~226--249)
- **Direction:** Mark affected breakdown tiles as stale. The DS provides alert-warning and status-dot patterns for this purpose.

#### Alignment to Target Direction

**Partially aligned.** Holdings has the best structural pattern (portfolio rows) and would benefit most from the simple DS spec fixes: serif page title, refined numeric tiers. The category grid and duplicate total are layout-level issues outside the DS spec that need resolution.

---

### Recurring

#### Scorecard


| Dimension                 | Score |
| ------------------------- | ----- |
| Hierarchy                 | 2/5   |
| Scanability               | 2/5   |
| Affordance                | 3/5   |
| Design system consistency | 2/5   |
| Visual rhythm             | 3/5   |
| State coverage            | 3/5   |
| Responsiveness / mobile   | 3/5   |


#### What Works

- `space-y-12` gives Recurring the most generous vertical rhythm of the four screens.
- `VisualDivider` between Income and Expenses is a clean structural break.
- `ExpensesSection` tab filter dynamically shows only populated expense types.
- `IncomeList` and `ExpenseList` inline editing reduces context-switching.

#### Key Issues

**1. Page title uses sans instead of serif (SPEC DEVIATION)**

Same pattern as other screens.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-1)
- **File:** `BudgetPage.tsx`

**2. No income-card or surplus-card pattern used (SPEC DEVIATION)**

The DS defines `.income-card` and `.surplus-card` as distinct visual treatments. Recurring treats income and surplus as generic rows in `BudgetBreakdown` --- same font, same weight, same colour as every other row. The surplus (the screen's primary output) is visually indistinguishable from expenses.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-4, DS-5)
- **Files:** `BudgetBreakdown.tsx`, `BudgetPage.tsx`
- **Direction:** The surplus row should use the `.surplus-card` treatment (accent-light background, serif amount in accent colour). If an income hero is shown, use the `.income-card` pattern.

**3. Three independent frequency selectors (DESIGN GAP)**

`BudgetBreakdown`, `IncomeSection`, and `ExpensesSection` each have their own `<Select>`. Three identical controls for one conceptual decision. The DS spec defines a segmented control (`.seg-control`) as the pattern for view-mode switching --- a single, unified control.

- **Severity:** High
- **Type:** DESIGN GAP (the DS provides the pattern; the screen doesn't use it correctly)
- **Files:** `BudgetPage.tsx`, `BudgetBreakdown.tsx`, `IncomeSection.tsx`, `ExpensesSection.tsx`
- **Direction:** Single frequency selector at page header level. The DS `seg-control` pattern would be appropriate here.

**4. BudgetBreakdown row hierarchy doesn't reflect accounting structure (DESIGN GAP)**

Five flat rows (Income, Expenses, Savings, Repayments, Surplus) all at identical visual weight. Savings and Repayments are sub-categories of Expenses but presented as peers. A user summing the visible numbers gets an incorrect result.

- **Severity:** High
- **Type:** DESIGN GAP
- **File:** `BudgetBreakdown.tsx`
- **Direction:** Show Income, Total Expenses, and Surplus as primary rows. Indent Savings and Repayments as sub-rows below Expenses using `num-body` tier (sans 15px) with "incl." prefix.

**5. Six modal dialogs for CRUD (DESIGN GAP)**

The DS spec says modals should be used for "Confirm / destructive --- modal on desktop, sheet on mobile. btn-danger confirm, ghost cancel." Creation flows are not prescribed as modals. The DS defines an inline edit mode pattern (`#advanced-patterns`, "Inline edit mode") and a wizard/multi-step pattern that would both be more appropriate for creation flows.

- **Severity:** Medium
- **Type:** DESIGN GAP (the DS reserves modals for destructive confirms; creation should use other patterns)
- **File:** `BudgetPage.tsx` (lines ~491--917)
- **Direction:** Replace creation modals with inline expansion or side panel. Retain modals only for delete confirmations per the DS spec.

**6. "Plan transfers" action at lowest affordance (DESIGN GAP)**

`variant="ghost"` with `text-muted-foreground` for the primary forward workflow action. The DS spec positions the secondary page-level action as `btn-ghost btn-sm` in the page header --- which is what the implementation does. But the DS also shows contextual inline CTAs (e.g. surplus destination prompts) for workflow progression. The ghost button alone is insufficient for this workflow-critical navigation.

- **Severity:** Medium
- **Type:** DESIGN GAP
- **File:** `BudgetPage.tsx` (lines ~372--379)
- **Direction:** Keep the ghost button in the header per the DS shell spec, but add a contextual CTA block after Expenses that re-states the surplus using the `.surplus-card` pattern with an embedded "Plan your transfers" action.

#### Alignment to Target Direction

**Misaligned.** The DS spec's income-card and surplus-card patterns, combined with the three numeric tiers, would transform this screen's hierarchy without any structural redesign. Most of the critique's high-severity issues map directly to existing spec patterns that haven't been implemented.

---

### Allocate

#### Scorecard


| Dimension                 | Score |
| ------------------------- | ----- |
| Hierarchy                 | 3/5   |
| Scanability               | 3/5   |
| Affordance                | 3/5   |
| Design system consistency | 2/5   |
| Visual rhythm             | 4/5   |
| State coverage            | 3/5   |
| Responsiveness / mobile   | 3/5   |


Design system consistency drops because this screen has the most spec-defined patterns (allocation rows, income card, surplus card, inline edit, negative surplus alert) and implements the fewest.

#### What Works

- `TransferSuggestions` as the clear hero followed by collapsible `CashFlowSummary` is the right priority ordering.
- `<details>`/`<summary>` for `CashFlowSummary` matches the DS spec's recommendation to use native HTML for keyboard accessibility.
- Sectioning into Repayments, Committed, and Surplus is correct information architecture.
- Empty states differentiate by cause (no income vs no expenses vs no suggestions).
- `space-y-12` gives the screen appropriate rhythm.

#### Key Issues

**1. Transfer suggestion rows don't follow the allocation row pattern (SPEC DEVIATION)**

The DS defines `.alloc-row` with `.alloc-icon`, `.alloc-name`, `.alloc-acct`, `.alloc-amount`, and optional `.progress-bar`. `TransferSuggestionRow` uses its own ad-hoc layout. The reference image shows allocation rows matching the DS pattern exactly.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-6)
- **File:** `TransferSuggestionRow.tsx`
- **Direction:** Implement using the `.alloc-row` pattern. Include icon containers per the DS icon system, name + account sublabel, right-aligned amount, and progress bars where appropriate.

**2. No income-card hero on Allocate (SPEC DEVIATION)**

The DS spec shows the `.income-card` specifically in the Allocate context: "Income card (Allocate hero)" with dark green background and serif amount. The implementation has no such hero element --- income context is buried in a context bar strip.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-4)
- **File:** `TransfersPage.tsx`
- **Direction:** Add an `.income-card` hero at the top of the transfer suggestions section showing the incoming income amount, source, and pay date. This is the visual anchor the reference image shows.

**3. Shortfall state uses a section label instead of an alert banner (SPEC DEVIATION)**

The DS "States pending visual design" table prescribes: "Negative surplus --- Surplus amount in `var(--danger)`. Alert banner above plan using `alert-danger`. Destination prompt hidden." The implementation uses a 12px uppercase `SectionLabel` with `text-destructive`.

- **Severity:** High
- **Type:** SPEC DEVIATION (DS-8)
- **File:** `TransferSuggestions.tsx` (lines ~270--284)
- **Direction:** Implement the prescribed pattern: `alert-danger` banner above the plan, surplus amount in `var(--danger)`, destination prompt hidden.

**4. No surplus-card at the bottom of the suggestion list (SPEC DEVIATION)**

The DS spec shows `.surplus-card` as the final element in an allocation row list. The reference image shows an "Unallocated surplus" card with accent-light background and serif amount. The implementation has no distinct surplus element at the bottom of suggestions.

- **Severity:** Medium
- **Type:** SPEC DEVIATION (DS-5)
- **File:** `TransferSuggestions.tsx`
- **Direction:** Add `.surplus-card` as the final element in the suggestion list when `hasSurplus` is true.

**5. `UnallocatedWarning` bypasses the DS token system (SPEC DEVIATION)**

Uses `border-yellow-500 bg-yellow-50 dark:bg-yellow-950` instead of `border-[var(--warning)] bg-[var(--warning-light)]`. The DS explicitly defines `--warning` and `--warning-light` tokens.

- **Severity:** Medium
- **Type:** SPEC DEVIATION (token bypass)
- **File:** `UnallocatedWarning.tsx`
- **Direction:** Use DS tokens: `border-[var(--warning)] bg-[var(--warning-light)]`.

**6. Inline edit mode not implemented (SPEC DEVIATION)**

The DS defines an inline edit mode for Allocate with a "Adjusting your plan" badge, inline currency inputs replacing static amounts, and "Update plan" / "Cancel" actions. The implementation uses a Dialog modal for editing the pay cycle and has no mechanism for adjusting individual allocation amounts.

- **Severity:** Medium
- **Type:** SPEC DEVIATION (DS-11)
- **Files:** `TransfersPage.tsx`, `PayCycleSetup.tsx`
- **Direction:** Implement the DS-prescribed inline edit mode. This is the most sophisticated interaction pattern in the DS spec and would significantly differentiate Allocate.

**7. Pay cycle context bar and hero headline duplicate the same date (DESIGN GAP)**

Same date visible ~80px apart.

- **Severity:** Medium
- **Type:** DESIGN GAP
- **Files:** `TransfersPage.tsx` (lines ~162--169), `TransferSuggestions.tsx`
- **Direction:** Absorb pay cycle context into the hero block. The DS shell spec shows a clean page header (`page-title` + `page-subtitle` + optional action button) --- the context bar is an addition that doesn't exist in the spec.

#### Alignment to Target Direction

**Partially aligned structurally, but the DS-specific patterns that would make it feel right are all missing.** The reference image *is* essentially the DS spec rendered. Implementing the income-card hero, allocation rows, surplus-card, and inline edit mode would transform this screen from "functional list of suggestions" to the confident, calm payday plan the reference depicts.

---

## 5. Cross-Cutting Themes

### Theme 1: Systematic Spec Deviation is the Primary Problem

This is not a product with missing design direction. The DS spec at `public/design-system-v2.html` is comprehensive, opinionated, and closely aligned with the reference direction. The primary problem is that the implementation diverges from it in at least 11 documented ways. The highest-impact work is not designing new patterns --- it is implementing the ones that already exist.

The pattern of deviation suggests the DS spec was created or updated after a significant portion of the implementation was already built, and the implementation was never reconciled. This is a design system adoption problem, not a design system quality problem.

### Theme 2: The Dual Token System Perpetuates Spec Deviation

The DS spec uses a clean custom token vocabulary (`--ink`, `--paper`, `--accent`, `--serif`, `--sans`, `--rl`, `--sp-`*). The implementation also carries shadcn HSL tokens (`hsl(var(--card))`, `hsl(var(--muted-foreground))`) and Tailwind utility-derived tokens (`--font-weight-bold: 500`). Components mix all three systems.

The shadcn token layer is the primary obstacle to DS spec adoption. When a developer creates a new component, the path of least resistance is `<Card>` + `text-muted-foreground` + `font-bold` --- shadcn conventions --- rather than the DS spec's `card` class + `var(--ink-3)` + `font-weight: 500`. Until the dual system is resolved, every new component will drift further from the spec.

### Theme 3: Flat Numeric Hierarchy Across All Screens

The DS defines three tiers (`num-display`, `num-balance`, `num-body`). The implementation uses one (`.metric-value` at 32px serif). This single deviation is responsible for the largest cross-screen hierarchy problem: every number on every screen competes equally for attention. Net worth, total assets, S&P 500 change, income total, and expense subcategory amounts all render at the same size and weight.

### Theme 4: Card Overuse and Nesting

The DS spec shows cards selectively: `.income-card` for the income hero, `.alloc-row` for allocation items, `.surplus-card` for the surplus, `.metric-tile` as standalone stat blocks, and `.card` for generic content grouping. The DS examples never nest cards inside cards. The implementation wraps everything in `<Card>` and then nests `.metric-tile` inside, producing double-bordered white-on-white surfaces.

### Theme 5: Mobile Navigation Spec Not Implemented

The DS spec defines a fixed bottom tab bar with 5 items, Allocate at centre position for thumb reach. The implementation uses a hamburger menu + slide-over drawer. This is a major spec deviation that affects all screens on mobile.

### Theme 6: Absent Motion

The DS spec references animated progress bars (`animation: fillBar 1.8s ease forwards`) and transition states (accordion chevron rotation), suggesting motion is expected. The implementation has almost no motion except `animate-ping` on the SetupProgress FAB. The DS spec's motion references, combined with the reference direction's calm feel, suggest deliberate, minimal transitions --- not the complete absence of motion present in the implementation.

---

## 6. Prioritised Action Plan

### Priority 1: Implement Existing DS Spec Patterns (Spec Deviations)

These are the highest-priority items because they require no new design work --- only faithful implementation of documented patterns.


| #     | What                                                                                                                                                                                                  | DS Ref  | Impact                        | Complexity | Level           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------- | ---------- | --------------- |
| SD-1  | **Serif page titles.** Apply `font-serif text-[28px] tracking-[-0.02em]` to all `<h1>` elements in authenticated pages.                                                                               | DS-1    | All screens                   | Low        | Token/component |
| SD-2  | **Three numeric display tiers.** Implement `num-display` (32px), `num-balance` (24px), `num-body` (15px sans). Apply appropriately: net worth = display, section totals = balance, row values = body. | DS-3    | All screens                   | Medium     | Component       |
| SD-3  | **Income-card pattern.** Implement `.income-card` (dark green bg, white serif number) on BudgetBreakdownTile (Overview) and as the hero on Allocate.                                                  | DS-4    | Overview, Allocate            | Medium     | Component       |
| SD-4  | **Surplus-card pattern.** Implement `.surplus-card` (accent-light bg, serif amount in accent) for surplus display on Overview, Recurring, and Allocate.                                               | DS-5    | Overview, Recurring, Allocate | Medium     | Component       |
| SD-5  | **Allocation row pattern.** Implement `.alloc-row` with icon, name, sublabel, amount, progress bar for `TransferSuggestionRow`.                                                                       | DS-6    | Allocate                      | Medium     | Component       |
| SD-6  | **Serif empty state titles.** Apply `font-serif text-[20px]` to all `.empty-state-title` equivalents. Audit copy per DS guidance.                                                                     | DS-7    | All screens                   | Low        | Component       |
| SD-7  | **Shortfall alert banner.** Replace `SectionLabel` shortfall with `alert-danger` banner. Surplus in `var(--danger)`. Hide destination prompt.                                                         | DS-8    | Allocate                      | Low        | Screen          |
| SD-8  | **Mobile bottom tab bar.** Replace hamburger + drawer with fixed bottom tab bar per DS spec: 5 items, Allocate at centre.                                                                             | DS-2    | All screens (mobile)          | High       | Layout          |
| SD-9  | **DM Sans weight discipline.** Audit and remove `font-bold` (700) usages. Replace with 500 maximum per DS weight rules.                                                                               | DS-9    | All screens                   | Medium     | Token           |
| SD-10 | **Token system alignment.** Replace `border-yellow-500 bg-yellow-50` and other raw Tailwind colours with DS tokens.                                                                                   | Various | All screens                   | Medium     | Token           |
| SD-11 | **Sidebar width.** Update `--sidebar-width` from 192px to 220px per DS spec.                                                                                                                          | DS-10   | Layout shell                  | Low        | Token           |


### Priority 2: Resolve Design System Adoption Barriers (Foundational)


| #   | What                                                                                                                                                                                              | Why                                                                                                             | Impact      | Complexity | Level     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | --------- |
| F1  | **Resolve the dual token system.** Choose the DS v2 custom tokens as canonical. Remove or alias the shadcn HSL tokens. Create a migration guide.                                                  | The dual system is the root cause of spec drift. Until resolved, every new component will use the wrong tokens. | All screens | High       | Token     |
| F2  | **Introduce varied spacing rhythm.** Replace uniform `space-y-6`/`space-y-12` with DS spacing tokens (`--sp-3` for siblings, `--sp-12` for section breaks, `--sp-16`/`--sp-20` for major topics). | Uniform spacing is not part of the DS spec. The token scale exists for varied rhythm.                           | All screens | Medium     | Layout    |
| F3  | **Add foundational motion.** Skeleton-to-content fade, page-level stagger on mount, expand/collapse transitions. Remove `animate-ping`.                                                           | The DS references animated progress bars and transitions. Complete absence of motion is a gap.                  | All screens | Medium     | Component |


### Priority 3: Screen-Level Design Gaps


| #   | What                                                                                                   | Why                                                     | Impact    | Complexity | Level     |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------- | ---------- | --------- |
| SC1 | **Remove placeholder cards on Overview.** Delete Latest News and Recent Transactions until functional. | Equal-weight placeholder tiles dilute signal.           | Overview  | Low        | Screen    |
| SC2 | **Flatten card nesting on Overview.** Remove inner borders on metric-tiles inside Cards.               | Double-bordered white-on-white is not a DS pattern.     | Overview  | Low        | Component |
| SC3 | **Remove duplicate Total Assets on Holdings.**                                                         | Redundant display of the same value.                    | Holdings  | Low        | Screen    |
| SC4 | **Single frequency selector on Recurring.**                                                            | Three dropdowns for one decision.                       | Recurring | Medium     | Screen    |
| SC5 | **Fix BudgetBreakdown accounting hierarchy.** Show sub-categories as indented sub-rows.                | Ambiguous arithmetic in a financial product.            | Recurring | Low        | Screen    |
| SC6 | **Reduce modal usage on Recurring.** Replace creation modals with inline patterns per DS.              | DS reserves modals for destructive confirms.            | Recurring | Medium     | Screen    |
| SC7 | **Collapse pay cycle context bar into hero block on Allocate.**                                        | Duplicate date display.                                 | Allocate  | Low        | Screen    |
| SC8 | **Implement inline edit mode on Allocate.**                                                            | DS-specced pattern that would differentiate the screen. | Allocate  | High       | Screen    |


---

## 7. Executive Summary

### The 3 Most Important Design Problems

**1. The design system is documented but not implemented.** `public/design-system-v2.html` is a comprehensive, opinionated spec that prescribes serif page titles, three numeric display tiers, a dark-green income card, an accent-light surplus card, allocation rows with icons and progress bars, serif empty state titles, a mobile bottom tab bar, and inline edit mode for Allocate. The implementation follows almost none of these patterns. The gap between the documented design system and the shipped UI is the single largest quality problem. This is not a design problem --- it is an adoption problem.

**2. One numeric tier where three are specified.** The DS defines `num-display` (32px), `num-balance` (24px), and `num-body` (15px). The implementation uses `metric-value` (32px) for everything. Net worth and S&P 500 1D change share a visual treatment. Income total and expense subcategories share a visual treatment. No value achieves visual primacy because every value uses the same formula. The tiered system is already designed and documented --- it just needs to be applied.

**3. The dual token system prevents spec adoption.** The codebase carries both DS v2 custom tokens (`--ink`, `--paper`, `--accent`) and shadcn HSL tokens (`hsl(var(--card))`, `hsl(var(--muted-foreground))`). Components mix them freely. The path of least resistance for new work is the shadcn system, which diverges from the DS spec. Until the token system is unified around the DS spec, every new component will drift further from the intended design.

### The 3 Highest-Leverage Fixes

**1. Implement the income-card and surplus-card patterns (SD-3, SD-4).** These two components would immediately introduce the visual hierarchy the reference shows: dark green hero for income, accent-light block for surplus, white cards for everything else. Three surface treatments instead of one. This is the single most visually impactful change and requires no new design work --- the CSS is documented in the DS spec.

**2. Apply three numeric display tiers (SD-2).** `num-display` for net worth, `num-balance` for section totals, `num-body` for row values. This creates instant hierarchy across all screens. The tiers are already documented with sizes, weights, and usage guidance.

**3. Serif page titles and empty state titles (SD-1, SD-6).** This is the lowest-effort highest-identity change. Adding `font-family: var(--serif)` to `<h1>` elements and empty state headings establishes the Instrument Serif typographic signature across every screen. Five minutes of token changes, visible on every page load.

### Distance from Desired Direction

The current UI is **materially misaligned** with the target direction, but **the design system that would close the gap already exists.** The DS spec at `public/design-system-v2.html` prescribes a product that would feel close to the reference: serif headings, tiered numeric display, dark-green income cards, accent-light surplus cards, allocation rows with progress bars, and a thumb-optimised mobile tab bar.

The distance is not a design problem. It is an implementation fidelity problem. The spec is strong. The tokens are sound. The component patterns are documented with CSS. What is missing is the final mile: building the authenticated product screens using the design system that was created to guide them.

Closing the gap does not require a redesign. It requires a reconciliation sprint: pick up the DS spec, compare it to each screen, and implement the documented patterns. The hardest part --- deciding what the product should look like --- has already been done.
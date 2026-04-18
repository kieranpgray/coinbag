# Tasks: Allocate page (DS v3 + allocate-final parity)

**Linear:** Full copy-paste issue bodies, dependency table, and mermaid graph — [linear-tickets.md](./linear-tickets.md). Stable IDs **ALLOC-1 … ALLOC-10** match tasks below.

## Critical path

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10

## Defaults (plan review — implement unless product overrides)

- **Repayments / action-required rows:** One committed row **“Repayments”** (or copy key `allocate.committedCategory.repayments`) aggregating all `kind` in `repayment` and `action_required_repayment`; icon background uses `var(--danger-light)` or DS `commitment-icon-*` equivalent. Does not duplicate per-expense rows.
- **Grouping key:** Group expenses by **domain category id** (from `useCategories` / expense’s category relation) → display **category name**; expenses without category → single **“Uncategorised”** row.
- **Cycle math:** Use **local calendar dates** (`date-fns` on `Date` at noon UTC or local start-of-day — pick one and document in module header); cycle index default = cycle containing **today** in local TZ; if none, nearest future pay date. **Bounds:** ±24 pay periods from anchor (adjust constant in one place).
- **CSS:** All new Allocate rules live under a **single scope** (e.g. `.allocate-page` wrapper on `TransfersPage`) to avoid clashing with dashboard `.income-card` / shadcn.
- **Cash flow block:** `**CashFlowSummary`** remains on the route inside a **disclosure** (“Cash flow by account”) **below** the plan stack, **closed** by default.
- **Copy vs persistence:** Inline edit still calls `**updatePayCycle` (global preferences)**. If product keeps Feature Copy v1.1 “this plan only”, add a **short footnote in edit panel** that saving updates pay-cycle settings used across Supafolio — **human input** if legal/product insists on exact v1.1 wording without qualification.

---

## Shell + design tokens

### Task 1: Scope Allocate layout wrapper and port DS v3 CSS

- **Linear ID:** ALLOC-1 — [issue body](./linear-tickets.md#alloc-1)
- **Linear — Blocked by:** *none* · **Blocks:** ALLOC-2, ALLOC-3, ALLOC-8
- **Depends on:** none
- **Creates/modifies:**
  - `[src/features/transfers/TransfersPage.tsx](src/features/transfers/TransfersPage.tsx)` (root wrapper class only, minimal)
  - New `[src/features/transfers/allocate.css](src/features/transfers/allocate.css)` (or scoped block in `[src/index.css](src/index.css)` if team prefers single file)
  - Import CSS from `TransfersPage` (if separate file)
- **Acceptance criteria:**
  - Root element of configured Allocate view has scope class (e.g. `allocate-page`) wrapping all new UI.
  - All rules from DS v3 Allocate block are present **prefixed** or nested under the scope class (no unscoped `.btn-ghost` overrides).
  - Existing pages using `.income-card` / `.income-amount` **unchanged** visually in smoke check (Dashboard tile or story).
  - `npm test` (or project default) still passes for unchanged suites.
- **Notes:** Source of truth: `design-system-v3.html` Allocate section. Banner + `plan-stack` opacity `0.72` for **upcoming and past** per DS v3 comments (not allocate-final demo script alone).
- **Human input needed:** none

---

## Cycle navigation

### Task 2: Add pay cycle list and cycle-state utilities

- **Linear ID:** ALLOC-2 — [issue body](./linear-tickets.md#alloc-2)
- **Linear — Blocked by:** ALLOC-1 (soft) · **Blocks:** ALLOC-3, ALLOC-6, ALLOC-7
- **Depends on:** Task 1 (none for pure TS; soft dependency — can run parallel after Task 1 exists for import path)
- **Creates/modifies:**
  - New `[src/features/transfers/utils/payCycles.ts](src/features/transfers/utils/payCycles.ts)`
  - New `[src/features/transfers/utils/__tests__/payCycles.test.ts](src/features/transfers/utils/__tests__/payCycles.test.ts)`
- **Acceptance criteria:**
  - Exported function(s): build ordered pay dates from `PayCycleConfig` (`frequency`, `nextPayDate`), with documented TZ rule in file header.
  - For each index, derive `active` | `upcoming` | `past` consistent with “today” in local calendar.
  - Default index selects cycle containing today; clamp indices to ±24 cycles (constant).
  - Unit tests cover: weekly/fortnightly/monthly, boundary at pay day, first/last index disabled semantics inputs.
- **Notes:** Do not wire UI yet.
- **Human input needed:** none

### Task 3: Build AllocateCycleStrip and wire shell header

- **Linear ID:** ALLOC-3 — [issue body](./linear-tickets.md#alloc-3)
- **Linear — Blocked by:** ALLOC-1, ALLOC-2 · **Blocks:** ALLOC-5, ALLOC-8
- **Depends on:** Task 1, Task 2
- **Creates/modifies:**
  - New `[src/features/transfers/components/AllocateCycleStrip.tsx](src/features/transfers/components/AllocateCycleStrip.tsx)`
  - `[src/features/transfers/TransfersPage.tsx](src/features/transfers/TransfersPage.tsx)`
- **Acceptance criteria:**
  - Sticky header matches DS: title **Allocate**, `btn-ghost btn-sm` Edit (behaviour stub OK until Task 5).
  - Cycle strip: chevrons, three slots, badge; chevrons disabled at ends; mobile: prev/next slots + badge hidden per DS `@media (max-width: 768px)`.
  - Subtitle reflects **active / upcoming / past** using i18n keys (past key may be placeholder until Task 10).
  - No business logic in component beyond calling utilities + props.
- **Notes:** Layer 2 sits below header; content column max-width can be stub until Task 4.
- **Human input needed:** none

---

## Edit flow

### Task 4: Extract shared pay-cycle form core

- **Linear ID:** ALLOC-4 — [issue body](./linear-tickets.md#alloc-4)
- **Linear — Blocked by:** *none* · **Blocks:** ALLOC-5
- **Depends on:** none (prefer after Task 3 to reduce merge pain — if parallel, coordinate on `PayCycleSetup`)
- **Creates/modifies:**
  - New shared module e.g. `[src/features/transfers/components/PayCycleFormFields.tsx](src/features/transfers/components/PayCycleFormFields.tsx)` + optional `usePayCycleForm.ts` OR props-driven fields
  - `[src/features/transfers/components/PayCycleSetup.tsx](src/features/transfers/components/PayCycleSetup.tsx)` (refactor to consume shared fields; behaviour unchanged)
- **Acceptance criteria:**
  - First-time / empty-state `PayCycleSetup` still saves same `PayCycleConfig` shape to `updatePayCycle`.
  - Existing tests for pay cycle (if any) pass; add one test that shared schema rejects invalid UUID / date.
  - Frequency options in UI **match** zod enum (`weekly` | `fortnightly` | `monthly`) only — no extra HTML options until schema expands.
- **Notes:** Surplus destination in edit panel = same field as `savingsAccountId` (optional UUID).
- **Human input needed:** none

### Task 5: Implement AllocateEditPanel and remove edit Dialog

- **Linear ID:** ALLOC-5 — [issue body](./linear-tickets.md#alloc-5)
- **Linear — Blocked by:** ALLOC-3, ALLOC-4 · **Blocks:** ALLOC-10
- **Depends on:** Task 3, Task 4
- **Creates/modifies:**
  - New `[src/features/transfers/components/AllocateEditPanel.tsx](src/features/transfers/components/AllocateEditPanel.tsx)`
  - `[src/features/transfers/TransfersPage.tsx](src/features/transfers/TransfersPage.tsx)` (remove `Dialog` edit path; toggle panel)
- **Acceptance criteria:**
  - Edit / Cancel toggles `.edit-panel.open`; subtitle switches to **Adjusting your plan** when open.
  - Cancel discards unsaved form state (react-hook-form reset to last saved `payCycle`).
  - **Update plan** persists via `updatePayCycle`, closes panel, invalidates transfer/cashflow queries as today.
  - No modal for primary edit path.
- **Notes:** If copy says “this plan only” but data is global, apply **Human input** default from section above.
- **Human input needed:** Product sign-off on footnote if they reject global-persistence wording.

---

## Data: committed + income + surplus

### Task 6: Implement cycle-scoped committed aggregation + parity test

- **Linear ID:** ALLOC-6 — [issue body](./linear-tickets.md#alloc-6)
- **Linear — Blocked by:** ALLOC-2 · **Blocks:** ALLOC-7, ALLOC-8, ALLOC-9
- **Depends on:** Task 2
- **Creates/modifies:**
  - New `[src/features/transfers/utils/allocateCommitted.ts](src/features/transfers/utils/allocateCommitted.ts)` (name flexible)
  - New `[src/features/transfers/utils/__tests__/allocateCommitted.test.ts](src/features/transfers/utils/__tests__/allocateCommitted.test.ts)`
- **Acceptance criteria:**
  - Input: pay cycle window (start/end from `payCycles`), expenses, categories; output: rows `{ categoryId, displayName, metaLine, amount, isMutedZero }`.
  - Repayment kinds from transfer layer: either import shared types and aggregate **into Repayments row** OR sum from expenses flagged as repayments — **one** approach, documented in file header.
  - **Parity (active cycle only):** `sum(row.amount)` equals sum of **coverage** suggestion amounts from `calculateTransferSuggestions` for same fixture data ± documented rounding (assert in test with frozen fixture).
  - Tests pass via `vitest`.
- **Notes:** If parity cannot be met without larger refactor, document gap in `Notes` and add `Human input` — do not silently ship mismatch.
- **Human input needed:** none if parity holds; else PM/engineering to accept divergence

### Task 7: Implement primary income + secondary links for plan stack

- **Linear ID:** ALLOC-7 — [issue body](./linear-tickets.md#alloc-7)
- **Linear — Blocked by:** ALLOC-2, ALLOC-6 · **Blocks:** ALLOC-8, ALLOC-9
- **Depends on:** Task 2, Task 6
- **Creates/modifies:**
  - New helper e.g. `[src/features/transfers/utils/allocateIncome.ts](src/features/transfers/utils/allocateIncome.ts)` + tests
  - Consumed later by `AllocatePlanStack`
- **Acceptance criteria:**
  - Primary line: amount for **selected cycle** from primary income + frequency (formula documented; matches user-visible Budget assumptions or explain delta).
  - Source line format: `[Name] · [Account] · [Frequency]` using real `useIncomes` / `useAccounts` / `payCycle`.
  - Secondary incomes render as `.income-card-secondary` links to `[ROUTES.app.budget](src/lib/constants/routes.ts)` with stable query param **only if** route reads it; else link to base Budget with TODO removed once Budget handles focus.
  - Unit test with mock incomes for one secondary link string.
- **Human input needed:** none

---

## UI integration

### Task 8: Assemble AllocatePlanStack (income, committed, banner, opacity)

- **Linear ID:** ALLOC-8 — [issue body](./linear-tickets.md#alloc-8)
- **Linear — Blocked by:** ALLOC-1, ALLOC-3, ALLOC-6, ALLOC-7 · **Blocks:** ALLOC-9, ALLOC-10
- **Depends on:** Task 1, Task 3, Task 6, Task 7
- **Creates/modifies:**
  - New `[src/features/transfers/components/AllocatePlanStack.tsx](src/features/transfers/components/AllocatePlanStack.tsx)`
  - May split subcomponents under `components/allocate/`
- **Acceptance criteria:**
  - Markup order: optional **upcoming banner** (`.upcoming-banner.show` for upcoming **and** past) → `.plan-stack` (income → committed → surplus shell without picker yet OK in this task if Task 9 follows immediately).
  - Income uses DS classes: `.income-card-label`, `.income-card-amount-lg` (or DS v3 equivalent), `.income-card-source` + dot.
  - Committed uses `.plan-section`, `.commitment-row`, category icon backgrounds per spec table (map category slug/name → token).
  - `plan-stack` opacity `0.72` when banner shown; `1` when active.
  - Tooltip for committed uses accessible Radix tooltip + same visual as `.tooltip-icon`.
- **Notes:** Surplus numeric header can show placeholder until Task 9.
- **Human input needed:** none

### Task 9: Surplus, shortfall, destination picker + preferences

- **Linear ID:** ALLOC-9 — [issue body](./linear-tickets.md#alloc-9)
- **Linear — Blocked by:** ALLOC-6, ALLOC-7, ALLOC-8 · **Blocks:** ALLOC-10
- **Depends on:** Task 6, Task 7, Task 8
- **Creates/modifies:**
  - `[src/features/transfers/components/AllocatePlanStack.tsx](src/features/transfers/components/AllocatePlanStack.tsx)` (or sibling `SurplusSection.tsx`)
  - `[src/hooks/useUserPreferences.ts](src/hooks/useUserPreferences.ts)` only if new fields needed (prefer **none** — reuse `savingsAccountId`).
- **Acceptance criteria:**
  - Surplus = income − committed for selected cycle; header uses **19px** surplus total class per DS; **Shortfall** label + red total when negative.
  - Shortfall shows `.shortfall-alert` + link **Review your amounts in Recurring →** to Budget; hides destination states.
  - Destination set vs no-destination vs picker open/close matches reference interactions; Confirm calls `updatePayCycle` with selected account id; Cancel restores draft.
  - Surplus tooltip (non-shortfall) includes **Income $X minus committed $Y** substring (i18n interpolation).
  - Empty accounts: picker shows **+ Add an account** to Accounts route; no crash when zero accounts.
- **Notes:** No “split between accounts” in v1.
- **Human input needed:** none

### Task 10: Finalise TransfersPage composition, i18n, and remove legacy hero

- **Linear ID:** ALLOC-10 — [issue body](./linear-tickets.md#alloc-10)
- **Linear — Blocked by:** ALLOC-5, ALLOC-8, ALLOC-9 · **Blocks:** *none*
- **Depends on:** Task 5, Task 8, Task 9
- **Creates/modifies:**
  - `[src/features/transfers/TransfersPage.tsx](src/features/transfers/TransfersPage.tsx)`
  - Remove or gut `[src/features/transfers/components/TransferSuggestions.tsx](src/features/transfers/components/TransferSuggestions.tsx)` usage from page (delete file only if fully unused; grep first)
  - `[src/features/transfers/components/CashFlowSummary.tsx](src/features/transfers/components/CashFlowSummary.tsx)` parent wrapper only — disclosure pattern
  - `[src/locales/en-US/pages.json](src/locales/en-US/pages.json)`, `[src/locales/en-AU/pages.json](src/locales/en-AU/pages.json)`
  - Tests under `src/features/transfers/__tests__/` or update existing
- **Acceptance criteria:**
  - Page: header + cycle strip + `.plan-col` (padding tokens) + edit panel + banner + plan stack + disclosure `CashFlowSummary` + `UnallocatedWarning` if still relevant.
  - No **view-mode Select** on Allocate surface; no “Move these amounts by…” hero; no repayment footer string from old component.
  - All Feature Copy v1.1 strings from approved spec (surplus tooltip, shortfall, banner lines, `allocateSubtitlePast`, etc.).
  - RTL tests updated; `vitest` green for transfers feature tests.
- **Notes:** When `edit` open and user changes cycle — **close edit panel** and reset form to saved `payCycle` (document in component comment).
- **Human input needed:** none

---

## Deferred items

- Per-cycle overrides stored separately from global `payCycle`.
- “Split between accounts” surplus destination.
- Historical actuals (bank) vs Recurring projections for past cycles.
- Feature flag `allocate_v2` (add in Task 1 or 10 if team wants rollback).

## Ambiguous areas (implementer judgement allowed)

- Exact **Repayments** row label/icon if not in i18n yet — use `pages.json` key and match tone of **Committed** / **Surplus**.
- **Instrument Serif** loading: ensure font already loaded app-wide; if not, add once in app entry (separate tiny task if missing).


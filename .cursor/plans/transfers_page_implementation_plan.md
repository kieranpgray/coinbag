# Transfers Page Redesign — Implementation Plan

**Audience:** Front-end staff engineer  
**Reference:** [Transfers Page Redesign Direction](transfers_page_redesign_direction.md)  
**Scope:** Restructure layout and components so Suggested Transfers is the hero, cash flow is supporting, and the page has one clear headline and no card stack.

---

## Goals (from design direction)

1. **Hero:** Suggested Transfers with headline “Move these amounts by [date]” and a single list (no nested cards).
2. **Supporting:** Pay cycle as a compact context bar; Cash Flow as compact or collapsible/tabbed.
3. **Structure:** Flatten hierarchy—list rows for suggestions, one content block; no cards inside cards.
4. **Copy:** Review-oriented; empty/loading states that explain purpose (“so your expenses are covered”).

---

## Phase 1: Page layout and hero block (TransfersPage + TransferSuggestions)

**Objective:** Reorder the page and make Suggested Transfers the first main content; introduce the time-bound headline. No new components yet—wire the headline and reorder sections.

### 1.1 TransfersPage.tsx

- **Section order (top to bottom):**
  1. Page title + secondary “Edit pay cycle” (e.g. link or ghost button).
  2. Pay cycle context bar (unchanged content; keep `bg-muted/50` strip).
  3. Account validation error (if any).
  4. Unallocated warning (if any).
  5. **Suggested Transfers block** (hero)—render before Cash Flow.
  6. **Cash Flow** (supporting)—render after Suggested Transfers.

- **Headline data:** Pass `nextPayDateFormatted` (or the raw `payCycle.nextPayDate`) and optionally `primaryAccountName` into the Suggested Transfers block so it can render “Move these amounts by [date]” (e.g. “Move these amounts by Friday 14 Mar 2025”). Decide whether “by [date]” is next pay date or a short phrase; document in code comment.

- **Edit Pay Cycle:** Keep as Dialog for now (Phase 3 can consider inline/sheet). Change the trigger from prominent `Button variant="outline"` to a secondary control (e.g. “Edit pay cycle” text link or ghost button) so the page title and hero headline dominate.

**Files:** `src/features/transfers/TransfersPage.tsx`

**Acceptance:** On load, order is: title → pay bar → errors/warnings → Suggested Transfers (with new headline) → Cash Flow. Edit Pay Cycle is visually secondary.

---

## Phase 2: Hero content — one list, no nested cards

**Objective:** Replace the “Card containing multiple Cards” pattern in Suggested Transfers with a single content block and list rows. Keep loading, error, and empty states in the same component.

### 2.1 TransferSuggestions.tsx

- **Remove** the outer `Card` wrapper from the main success state. Use a single block: e.g. a `section` or `div` with a single border/background so it reads as one unit (e.g. `rounded-lg border bg-card` on the container only).

- **Headline:** Accept `nextPayDateFormatted` (or equivalent) as a prop. Render a single prominent headline, e.g. “Move these amounts by [date].” If no date (edge case), fallback to “Suggested transfers” or “What to move.”

- **View mode (Weekly/Fortnightly/Monthly):** Keep the Select; place it in the same header row as the headline (e.g. right-aligned) so it doesn’t compete with the headline.

- **List:** Render suggestions as **list rows**, not as `TransferSuggestionCard` (which is a Card). Options:
  - **Option A (recommended):** New presentational component `TransferSuggestionRow` — same data as `TransferSuggestionCard` but layout: one row (e.g. `fromAccount → toAccount`, amount, optional Surplus badge), with border-b between rows. No Card.
  - **Option B:** Reuse and adapt `TransferSuggestionCard` to a “row” variant (no Card, flat list item). Risk: component name and existing Card usage may confuse; prefer a dedicated Row component for clarity.

- **Footnote:** Keep the Info alert (“Calculations based on recurring…”) below the list; style as a small caption or compact alert so it doesn’t look like another card.

- **Loading / error / empty:** Keep the same states. For loading, use a single block with skeletons that match the new list layout (e.g. 3–4 lines). For empty, use the new copy direction: e.g. “When you have income in one account and expenses in another, we’ll show what to move so your expenses are covered.” Optionally one in-app link (e.g. “Set up pay cycle” or “Add expenses”) if it fits product.

**Files:**  
- `src/features/transfers/components/TransferSuggestions.tsx` (layout, headline, list, states)  
- `src/features/transfers/components/TransferSuggestionRow.tsx` (new; list row UI)

**Data:** Continue using `useTransferSuggestions()` and existing `TransferSuggestion` type; no API changes.

**Acceptance:** Suggested Transfers is one block with one headline, view-mode selector, list of rows (no cards), and footnote. No Card wrapping the list; no nested Cards.

### 2.2 TransferSuggestionCard.tsx

- **Decision:** Keep file for now if used elsewhere; otherwise remove after Phase 2. If only used by TransferSuggestions, delete after `TransferSuggestionRow` is in place and wired.

**Files:** `src/features/transfers/components/TransferSuggestionCard.tsx` (delete or retain per usage)

---

## Phase 3: Cash Flow as supporting (compact or collapsible)

**Objective:** Make Cash Flow clearly secondary: either a compact summary or a collapsible “By account” section so it doesn’t compete with the hero.

### 3.1 Approach: Collapsible “By account” section

- **Recommendation:** Implement as a **collapsible section** (e.g. “Account cash flow” or “By account”) so the default view is hero-only; users who want detail can expand. Avoids tabs (no need for multiple top-level tabs on this page) and keeps one scroll flow.

- **UI:** Use a single container (not a full Card) with:
  - A header row: title “Account cash flow” (or “By account”) + expand/collapse control (chevron or “Show”/“Hide”).
  - When expanded: list of account rows (see 3.2). No per-account Cards.

- **Primitive:** No Collapsible in `src/components/ui` today. Options:
  - **A:** Native `<details>` / `<summary>` with minimal styling (fast, accessible).
  - **B:** Add `Collapsible` from Radix UI and use it here and elsewhere later.

Recommend **A** for this feature unless the team already plans to add Collapsible; keep the door open to refactor to **B** later.

### 3.2 CashFlowSummary.tsx and AccountCashFlowCard

- **CashFlowSummary:** Refactor to:
  - Render the collapsible wrapper (title + expand/collapse).
  - When expanded, render a **list of account rows** (no Card per account). Each row: account name, income, expenses, net (and optional “View breakdown” control).
  - Keep loading/error/empty handling; when collapsed, loading can show a single line or the header only.

- **AccountCashFlowCard:** Replace with a presentational **AccountCashFlowRow** (or inline the row markup in CashFlowSummary). Row content: same data (accountName, monthlyIncome, monthlyExpenses, net, expand/collapse for breakdown). “View breakdown” can still open `AccountBreakdownModal` from the row (e.g. link or small button).

- **AccountBreakdownModal:** No change; keep modal for now. Optional later: replace with inline expanded section under the row.

**Files:**  
- `src/features/transfers/components/CashFlowSummary.tsx` (collapsible + list of rows)  
- `src/features/transfers/components/AccountCashFlowRow.tsx` (new; replaces Card with row)  
- `src/features/transfers/components/AccountCashFlowCard.tsx` (remove after Row is wired)

**Data:** Keep `useCashFlowByAccount()` and `AccountCashFlow` type; no API changes.

**Acceptance:** Cash Flow is one collapsible section; when expanded, it shows account rows only (no nested cards). Default state: collapsed so hero dominates.

---

## Phase 4: Copy and empty/loading states

**Objective:** Align all user-facing copy with “monthly/quarterly reviewer” and “so your expenses are covered.”

### 4.1 Copy updates

- **Empty suggestions:** Replace “No transfer suggestions available” / “All expenses are covered by income…” with something like: “When you have income in one account and expenses in another, we’ll show what to move here so your expenses are covered.” Add one clear next step if applicable (e.g. “Set up pay cycle” or “Add expenses and assign accounts”).

- **Loading suggestions:** Replace “Calculating transfer recommendations…” with e.g. “Calculating what to move…” or “Preparing your transfer plan…”

- **Cash flow empty:** Similar tone—e.g. “Add income and expenses with account assignments to see cash flow and transfer suggestions.”

- **Pay cycle bar:** Optional microcopy tweak to reinforce review (e.g. “Next pay: [date] · [frequency] → [account]”) — already close; only adjust if needed.

**Files:**  
- `src/features/transfers/components/TransferSuggestions.tsx`  
- `src/features/transfers/components/CashFlowSummary.tsx`  
- Optionally `TransfersPage.tsx` (pay bar)

**Acceptance:** All relevant empty and loading strings match the review-oriented, “expenses covered” framing.

---

## Phase 5: Polish and accessibility

**Objective:** Ensure hierarchy is clear (semantics and visuals), and secondary controls don’t compete with the hero.

### 5.1 Semantics and heading levels

- **TransfersPage:** One `<h1>` (e.g. “Transfers”). Hero headline “Move these amounts by [date]” as `<h2>` so the outline is correct.
- **Cash flow section:** Collapsible title as `<h2>` or `<h3>` (consistent with rest of app).
- **List structure:** Use `<ul>` / `<li>` for suggestion rows (and optionally for account rows) for screen readers.

### 5.2 Focus and keyboard

- Collapsible (details/summary or Collapsible) must be keyboard-accessible and respect reduced motion if we add animation later.
- “Edit pay cycle” and “View breakdown” remain focusable with visible focus styles (rely on existing Button/link styles).

### 5.3 Responsive

- Hero headline + view-mode selector: stack on small viewports if needed (headline full width, selector below or right).
- List rows: ensure from/to and amount don’t wrap awkwardly; truncate or allow wrap with clear hierarchy (amount stays prominent).

**Files:** All touched components; no new files unless adding Collapsible primitive.

**Acceptance:** Heading hierarchy valid; lists semantic; keyboard and focus work; layout works on narrow viewport.

---

## Implementation order summary

| Phase | Focus | Key files |
|-------|--------|-----------|
| 1 | Page order, hero position, headline data, demote Edit | `TransfersPage.tsx` |
| 2 | Hero as one block + list rows; new headline | `TransferSuggestions.tsx`, new `TransferSuggestionRow.tsx` |
| 3 | Cash flow collapsible + account rows | `CashFlowSummary.tsx`, new `AccountCashFlowRow.tsx` |
| 4 | Copy for empty/loading and review framing | `TransferSuggestions.tsx`, `CashFlowSummary.tsx` |
| 5 | A11y, semantics, responsive | All touched components |

---

## Technical notes

- **State:** View mode (`weekly` / `fortnightly` / `monthly`) stays in TransfersPage and is passed down; optional persistence via `useUserPreferences` already in place—no change required.
- **Hooks:** No changes to `useTransferSuggestions`, `useCashFlowByAccount`, `usePayCycle`; all data shapes unchanged.
- **Types:** Reuse `TransferSuggestion`, `AccountCashFlow`; no new domain types.
- **Modals:** Edit Pay Cycle and Account Breakdown remain modals for this iteration; “consider inline/sheet later” is out of scope.

---

## Testing and validation

- **Manual:** Load Transfers with pay cycle set; confirm order (pay bar → suggestions hero → cash flow). Collapse/expand cash flow. Test empty suggestions, empty cash flow, loading, and error states. Test view mode switch. Check mobile width.
- **Regression:** Ensure “Edit pay cycle” still opens dialog and saves; Unallocated warning still links to Budget; “View breakdown” still opens modal with correct data.
- **Build:** `pnpm tsc --noEmit` and `pnpm build` per project rules.

---

## Rollback

- Each phase is a discrete set of file edits. Rollback by reverting the commit(s) for that phase. No DB or API changes; no feature flags required. If Phase 2 is reverted, keep `TransferSuggestionCard` until Phase 2 is re-applied so the page doesn’t break.

---

## Out of scope (for later)

- Changing “Edit pay cycle” from modal to inline/sheet.
- Replacing Account Breakdown modal with inline expansion.
- Adding a Collapsible primitive to the design system (unless we choose Option B in Phase 3).
- Any new primary CTA (e.g. copy to clipboard or open bank).

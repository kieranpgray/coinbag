# Design uplift — ticket triage and sequencing

**Workflow:** [design-uplift-delivery-system.md](design-uplift-delivery-system.md)  
**Critique index:** [design-critique-index.md](design-critique-index.md)  
**Linear epic:** [PRO-7](https://linear.app/productised/issue/PRO-7/epic-design-system-ui-critique-design-system-v2html-alignment) (Supafolio, Design System label)

**Dependency source of truth:** The epic description documents `blocked by` relationships. If those links are not also modelled as relations in Linear, keep this file aligned with the epic table when planning.

---

### PRO-7: [Epic] Design system — UI critique & design-system-v2.html alignment

- Summary: Container for PRO-8–PRO-36; defines cross-issue blockers, suggested phases, and success criteria tied to `design-critique.md` and `design-system-v2.html`.
- Critique mapping: Meta — all themes **T1–T19**; DS deviations **DS-1–DS-11**.
- Classification: **foundation** (programme container; not implementable as a single PR).
- Blocked by: (none)
- Blocks: (none — epic is parent only)
- Likely implementation surface: **mixed** (N/A at epic level).
- Suggested execution order: Use child tickets; do not “implement the epic” as one task.
- Notes: Child dependencies below mirror the epic’s markdown table. Reconcile with Linear relation graph if it is later populated.

---

### PRO-8: DS: Authenticated page titles use Instrument Serif (DS-1)

- Summary: Replace sans `text-h1-`* + `font-bold` on all authenticated `<h1>`s with DS `.page-title` (Instrument Serif, 28px, -0.02em tracking).
- Critique mapping: **T1**, **DS-1**; ties to **T7** (avoid 700 on titles).
- Classification: **foundation** (typographic voice across app).
- Blocked by: (none in epic set)
- Blocks: **PRO-13** (empty-state serif titles follow page-title decision per epic).
- Likely implementation surface: **mixed** (shared layout/header primitive ideal + four page files).
- Suggested execution order: **Early wave 1** — high leverage, low risk; before or parallel with **PRO-9**; must complete before **PRO-13**.
- Notes: Scope is appropriately narrow if centralised; avoid duplicating one-off classes on each page. **Not too narrow** if only one page is updated — verify all four routes.

---

### PRO-9: DS: Implement numeric display tiers num-display / num-balance / num-body (DS-3)

- Summary: Add three numeric tiers in CSS; stop using single `.metric-value` for every amount; apply display/balance/body per DS.
- Critique mapping: **T2**, **DS-3**; unlocks **T3**, **T17** sub-rows.
- Classification: **foundation**.
- Blocked by: (none in epic set)
- Blocks: **PRO-10**, **PRO-11**, **PRO-12**, **PRO-31** (per epic).
- Likely implementation surface: **shared primitive** (`index.css` + consumers across Overview, Wealth, Budget, Allocate-related components).
- Suggested execution order: **Early wave 1**, immediately after or parallel **PRO-8**; **before** income/surplus/allocation rows/breakdown hierarchy tickets.
- Notes: **Scope is large** (many call sites) but **correctly scoped** as one primitive + rollout; splitting only by screen risks inconsistent tier rules — prefer one ticket if execution keeps a single mapping table for “which metric uses which tier”.

---

### PRO-10: DS: Income card pattern — Overview budget tile & Allocate hero (DS-4)

- Summary: Implement `.income-card` / `.income-amount` on Overview `BudgetBreakdownTile` and as Allocate hero context.
- Critique mapping: **T3**, **T18**, **DS-4**.
- Classification: **dependent**.
- Blocked by: **PRO-9**
- Blocks: **PRO-34** (merge pay date into hero assumes income hero exists per epic).
- Likely implementation surface: **mixed** (shared CSS/pattern + `BudgetBreakdownTile`, `TransfersPage` / `TransferSuggestions`).
- Suggested execution order: **Wave 2** after **PRO-9**; before **PRO-34**.
- Notes: Coordinate amounts inside card with **T2** classes. **Too narrow** if Allocate hero is skipped while only Overview ships — ticket title expects both surfaces.

---

### PRO-11: DS: Surplus card pattern — Overview, Recurring, Allocate (DS-5)

- Summary: Implement `.surplus-card` / `.surplus-amount` for surplus across Overview, Recurring, Allocate (incl. list footer where applicable).
- Critique mapping: **T3**, **T18**, **DS-5**; relates **T17** (contextual CTA).
- Classification: **dependent**.
- Blocked by: **PRO-9**
- Blocks: **PRO-33** (contextual surplus CTA pairs with surplus-card per epic).
- Likely implementation surface: **mixed** (shared pattern + multiple routes).
- Suggested execution order: **Wave 2** after **PRO-9**; before **PRO-33**.
- Notes: Align with **T12** if Overview still nests cards — avoid double surfaces. **Too broad** if Allocate footer + Recurring + Overview are shipped without a single shared component/CSS module.

---

### PRO-12: DS: Allocation rows — implement .alloc-row on Allocate (DS-6)

- Summary: Refactor `TransferSuggestionRow` / `TransferSuggestions` to DS `.alloc-row` anatomy (icon, name, account sublabel, amount, optional progress).
- Critique mapping: **T4**, **DS-6**; prerequisite for **T6**, **T10** polish on same screen.
- Classification: **dependent**.
- Blocked by: **PRO-9**
- Blocks: **PRO-19**, **PRO-14**, **PRO-35** (per epic: layout stable before inline edit, shortfall UI, CashFlowSummary hierarchy polish).
- Likely implementation surface: **shared component** (row primitive + Allocate list).
- Suggested execution order: **Wave 2** after **PRO-9**; before **PRO-14**, **PRO-19**, **PRO-35**.
- Notes: **Do not** land **PRO-14** or **PRO-19** first — churn on the same files. **PRO-35** is polish after row pattern.

---

### PRO-13: DS: Empty states — serif titles + copy audit (DS-7)

- Summary: Apply serif empty-state titles (~20px per spec section); audit copy away from generic absence language where feature copy exists.
- Critique mapping: **T5**, **DS-7**.
- Classification: **dependent**.
- Blocked by: **PRO-8** (epic: serif empty states follow page-title decision).
- Blocks: (none listed)
- Likely implementation surface: **mixed** (breakdown tiles across Dashboard, Wealth, Budget — multiple components).
- Suggested execution order: **After PRO-8**; can parallel **PRO-9** if resourcing allows.
- Notes: **DESIGN GAP** risk on copy — product may need to supply replacement strings. **Too narrow** if only one screen’s empties are updated.

---

### PRO-14: DS: Shortfall / negative surplus — alert-danger + danger amount (DS-8)

- Summary: Shortfall state: `alert-danger` above plan, surplus in `var(--danger)`, hide destination prompt; replace small uppercase label treatment.
- Critique mapping: **T6**, **DS-8**.
- Classification: **dependent**.
- Blocked by: **PRO-12** (epic: same suggestions layout as rows).
- Blocks: (none listed)
- Likely implementation surface: **mixed** (`TransferSuggestions.tsx` + shared `Alert` styling/tokens).
- Suggested execution order: **After PRO-12** (and after **PRO-9** transitively).
- Notes: Depends on danger/alert tokens — align with **PRO-17** / **PRO-20** if alert variants still shadcn-only.

---

### PRO-15: DS: Mobile navigation — bottom tab bar per spec (DS-2)

- Summary: Replace hamburger + `MobileNav` drawer with fixed 56px tab bar; five items; Allocate centre (position 3).
- Critique mapping: **T8**, **DS-2**.
- Classification: **foundation** (mobile IA for all authenticated routes).
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **mixed** — **responsive layout only** at shell level plus routing/active state (**state handling**).
- Suggested execution order: **Early–mid**; can parallel typography wave; test all main routes + deep links.
- Notes: **High regression risk** for navigation and safe areas. **Too broad** for a single PR if routing, auth gates, and “More” overflow are all bundled without a checklist.

---

### PRO-16: DS: Typography weights — DM Sans 300–500 only; remove erroneous font-bold 700 (DS-9)

- Summary: Audit `font-bold` / `font-semibold` / arbitrary weights; keep DM Sans within DS 300–500; fix Tailwind 700 leak.
- Critique mapping: **T7**, **DS-9**; reinforces **T1**, **T5**, **T2** (`num-body`).
- Classification: **foundation**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **shared primitive** (Tailwind config / global CSS + wide component sweep).
- Suggested execution order: **Early wave 1** or parallel **PRO-8**/**PRO-9**; ideally before large UI tickets to avoid rework on emphasis.
- Notes: **Scope can balloon** — define grep-driven acceptance and cap optional follow-ups. **Sequencing mistake:** doing **PRO-8** titles with `font-bold` still applied.

---

### PRO-17: DS: Token hygiene — replace raw Tailwind colours with DS tokens (SD-10)

- Summary: Fix `UnallocatedWarning` and similar to use `--warning` / `--warning-light`; grep for other raw palette usage.
- Critique mapping: **T11**; supports **T6**, **T14**.
- Classification: **independent** (no epic blockers).
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **shared primitive** (token usage) with **route/screen-specific** hotspots.
- Suggested execution order: **Early–mid**; before heavy Allocate polish if warning/danger surfaces keep getting “fixed” ad hoc.
- Notes: **Risk of scope creep** if “repo-wide” becomes endless — time-box or split by surface after first pass. **PRO-20** may subsume some decisions; avoid conflicting alias strategies.

---

### PRO-18: DS: Shell sidebar width 220px (design-system-v2 --shell-sidebar-w)

- Summary: Align expanded sidebar to 220px (`--shell-sidebar-w`); verify collapsed width and layout reflow.
- Critique mapping: **T9**, **DS-10**.
- Classification: **independent** (shell tweak).
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **shared primitive** + **responsive layout only** (`index.css`, `Sidebar.tsx`).
- Suggested execution order: **Any early slot**; low coupling.
- Notes: **Appropriately narrow**.

---

### PRO-19: DS: Allocate inline edit mode — “Adjusting your plan” + row inputs (DS-11)

- Summary: Implement DS inline edit: badge, compact currency inputs in rows, Update/Cancel; reduce reliance on dialog for plan edits.
- Critique mapping: **T10**, **DS-11**; builds on **T4**.
- Classification: **dependent**; **feature**-sized.
- Blocked by: **PRO-12**
- Blocks: (none listed)
- Likely implementation surface: **mixed** — **state handling** + **route/screen-specific** + possible shared input primitive.
- Suggested execution order: **Allocate wave** after **PRO-12** (and **PRO-9** transitively).
- Notes: **Largest Allocate ticket** — easy to under-estimate validation, undo, and error states. **Blocked** until row structure stable.

---

### PRO-20: Foundation: Unify colour tokens — DS v2 custom vs shadcn HSL (F1)

- Summary: Choose DS v2 as canonical for authenticated surfaces; map/alias shadcn tokens; migration guide.
- Critique mapping: **T14** (root cause of drift); enables **T11**, **T17**, long-term consistency.
- Classification: **foundation**.
- Blocked by: (none in epic set)
- Blocks: (none listed explicitly — but practically **blocks clean token work** everywhere if deferred indefinitely).
- Likely implementation surface: **mixed** (tokens + widespread consumers).
- Suggested execution order: **Strategic early track** — parallel to **PRO-8**/**PRO-9** but needs owner decision; **before** large “grep the repo” passes multiply conflicting fixes.
- Notes: **Very broad** — epic correctly calls out high complexity. **Sequencing mistake:** many small token tweaks (**PRO-17**) fighting a later **PRO-20** reversal. Prefer **spike + alias strategy** first.

---

### PRO-21: Foundation: Varied vertical spacing rhythm — DS spacing tokens (F2)

- Summary: Replace uniform `space-y-6` / `space-y-12` misuse with varied `--sp-`* rhythm (pairing vs section breaks), starting with Overview.
- Critique mapping: **T13**; interacts with **T12**.
- Classification: **dependent** (on Overview structure settling).
- Blocked by: **PRO-24** (epic)
- Blocks: (none listed)
- Likely implementation surface: **shared primitive** (layout convention) + **route/screen-specific** (Dashboard).
- Suggested execution order: **After PRO-24** on Overview.
- Notes: Doing **PRO-21** before **PRO-24** risks re-spacing layout that will be torn apart by flattening.

---

### PRO-22: Foundation: Motion baseline — loading transitions; remove SetupProgress ping (F3)

- Summary: Skeleton→content fade, restrained stagger, expand/collapse polish; remove `animate-ping` (coordinate SetupProgress).
- Critique mapping: **T19**; overlaps **PRO-26** on ping removal.
- Classification: **dependent** on **PRO-26** for completion (epic: PRO-22 should not complete until ping removed).
- Blocked by: **PRO-26**
- Blocks: (none listed)
- Likely implementation surface: **mixed** (global motion primitives + page-level skeletons).
- Suggested execution order: **After PRO-26** for “done”; can **start** global motion utilities earlier if ping removal is explicitly excluded from Definition of Done until **PRO-26** lands.
- Notes: Epic dependency is **documentation-only** in Linear API — ensure team tracks **PRO-22** DoD vs **PRO-26**.

---

### PRO-23: Overview: Remove or demote Latest News & Recent Transactions placeholder cards (SC1)

- Summary: Remove or demote equal-weight placeholder cards that compete with net worth.
- Critique mapping: **T15** (placeholders); critique SC1.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** (`DashboardPage.tsx`).
- Suggested execution order: **Early Overview cleanup**; parallel with **PRO-24** planning.
- Notes: **Appropriately narrow** product decision: remove vs demote — confirm with PM.

---

### PRO-24: Overview: Flatten card-in-card nesting; inner metrics without double borders (SC2 / S2)

- Summary: Remove Card wrapping metric-tile stacks; use paper-2 / dividers per DS; reduce double white borders.
- Critique mapping: **T12**, **T3** adjacency; **T13** prerequisite for rhythm.
- Classification: **independent** (no epic blockers).
- Blocked by: (none in epic set)
- Blocks: **PRO-25**, **PRO-21** (per epic).
- Likely implementation surface: **mixed** (multiple Overview components).
- Suggested execution order: **Before PRO-25 and PRO-21** — structural Overview pass early.
- Notes: **High churn** across many files; **too broad** if bundled with unrelated screens — keep scoped to Overview.

---

### PRO-25: Overview: Loading skeleton layout matches populated dashboard composition

- Summary: Rebuild skeleton to mirror hero + two-column + full-width sections; avoid four equal blocks mismatch.
- Critique mapping: **T15** (skeleton); DS structural principle from critique.
- Classification: **dependent**.
- Blocked by: **PRO-24**
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** (`DashboardPage.tsx`).
- Suggested execution order: **Immediately after PRO-24**.
- Notes: **Sequencing mistake:** perfecting skeleton before card layout finalises.

---

### PRO-26: Overview: Replace SetupProgress FAB with inline / non-overlay progress (critique)

- Summary: Remove fixed FAB + ping; inline dismissible progress or compact indicator per DS calm UX.
- Critique mapping: **T15**, **T19**; coordinates with **PRO-22**.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: **PRO-22** (epic: motion baseline ticket completion).
- Likely implementation surface: **mixed** (`SetupProgress.tsx` + Dashboard placement).
- Suggested execution order: **Early Overview** if ping is considered harmful; before declaring **PRO-22** complete.
- Notes: **Product/design** choice for replacement pattern — **DESIGN GAP** details.

---

### PRO-27: Holdings: Remove duplicate Total Assets — keep WealthBreakdown only (SC3)

- Summary: Remove redundant assets tile in `AssetPortfolioSection`; keep `WealthBreakdown` as single source.
- Critique mapping: **T16**; SC3.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** / small component delete.
- Suggested execution order: **Any mid-wave** Holdings pass.
- Notes: **Narrow and safe**.

---

### PRO-28: Holdings: Category layout + icon noise — single column & DS-aligned icons

- Summary: Prefer single-column category stack; reduce `bg-primary/10` icon repetition; align with DS icon containers or remove.
- Critique mapping: **T16**; layout + token chrome.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **mixed** (`AssetPortfolioSection`, `AssetCategoryGroup`).
- Suggested execution order: After or with **PRO-27** if touching same files.
- Notes: **Visual change** — screenshot/regression pass at `md` breakpoint.

---

### PRO-29: Holdings: Propagate assets section errors to WealthBreakdown totals

- Summary: When `assetsError`, breakdown totals should show stale/unavailable treatment per DS warning patterns.
- Critique mapping: **T16**; trust / data integrity.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **mixed** — **state handling** (`WealthPage.tsx`) + presentation on `WealthBreakdown`.
- Suggested execution order: Mid Holdings wave; can parallel **PRO-27**/**PRO-28**.
- Notes: **State matrix** can get subtle (assets fail, liabilities OK) — scope explicit cases in mini-plan.

---

### PRO-30: Recurring: Single page-level pay frequency control (SC4)

- Summary: One frequency control at page level; remove triple `<Select>` from `BudgetBreakdown` / `IncomeSection` / `ExpensesSection`; optional `seg-control`.
- Critique mapping: **T17**; SC4.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **mixed** — **state handling** + **route/screen-specific** (`BudgetPage` + children).
- Suggested execution order: **Start Recurring wave** before deep **BudgetBreakdown** hierarchy (**PRO-31**) to avoid thrash on shared state.
- Notes: **State lift** required — mini-plan should name prop/context source of truth.

---

### PRO-31: Recurring: BudgetBreakdown — show expenses sub-rows; fix ambiguous arithmetic (SC5)

- Summary: Primary rows for income, total expenses, surplus; indent savings/repayments under expenses with `num-body` / “incl.” semantics.
- Critique mapping: **T17**, **T2** (tiers for sub-rows).
- Classification: **dependent**.
- Blocked by: **PRO-9**
- Blocks: **PRO-32** (epic: hierarchy stable before modal reshaping).
- Likely implementation surface: **route/screen-specific** + **shared primitive** (tier classes).
- Suggested execution order: **After PRO-9**; with **PRO-30** ordering preference to settle page state first.
- Notes: **Trust-critical** — validate arithmetic copy with product. **Too narrow** if sub-rows ship without **num-body** tier.

---

### PRO-32: Recurring: Reduce income/expense creation modals — inline or sheet (SC6)

- Summary: Move create flows off modals toward inline/sheet; keep destructive confirms modal per DS.
- Critique mapping: **T17**; SC6; large **DESIGN GAP** / IA.
- Classification: **dependent**.
- Blocked by: **PRO-31**
- Blocks: (none listed)
- Likely implementation surface: **mixed** — **state handling** + heavy **BudgetPage.tsx** refactor.
- Suggested execution order: **Late Recurring wave** after **PRO-31**.
- Notes: **Very broad** (945-line page, six dialogs) — high churn risk; consider phased milestones or sub-issues. **Sequencing mistake:** doing before **PRO-31** forces layout rework twice.

---

### PRO-33: Recurring: Elevate “Plan transfers” workflow affordance + contextual surplus CTA

- Summary: Strengthen header action and/or add contextual surplus block + CTA after Expenses; pairs with surplus card.
- Critique mapping: **T17**, **T3**; ties to **PRO-11**.
- Classification: **dependent**.
- Blocked by: **PRO-11**
- Blocks: (none listed)
- Likely implementation surface: **mixed** (`BudgetPage.tsx` content + header).
- Suggested execution order: **After PRO-11** (and **PRO-9** transitively).
- Notes: **Too weak** if only button variant changes without surplus treatment — epic explicitly links to **PRO-11**.

---

### PRO-34: Allocate: Merge duplicate pay date — context into TransferSuggestions hero (SC7)

- Summary: Single hero/subtitle for pay cycle; remove duplicate date strip ~80px apart.
- Critique mapping: **T18**; SC7.
- Classification: **dependent**.
- Blocked by: **PRO-10** (epic: income hero exists first).
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** (`TransfersPage.tsx`, `TransferSuggestions.tsx`).
- Suggested execution order: **After PRO-10**; can align with **T3** Allocate hero work in same pass if agreed.
- Notes: **Too narrow** if hero work from **PRO-10** is incomplete — coordinate one Allocate “hero block” ticket pair in implementation.

---

### PRO-35: Allocate: CashFlowSummary — section heading matches page hierarchy (h2 styling)

- Summary: `<details>` summary visually matches `h2` weight scale used elsewhere on Allocate.
- Critique mapping: **T18** polish; hierarchy; **T7** if `font-semibold` wrong.
- Classification: **dependent**.
- Blocked by: **PRO-12**
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** (`CashFlowSummary.tsx`).
- Suggested execution order: **After PRO-12**; low risk polish pass.
- Notes: **Narrow**; verify semantic HTML (`h2` inside `summary` patterns) for a11y.

---

### PRO-36: Allocate: PayCycleSetup — avoid Card inside Dialog (double frame)

- Summary: Remove nested Card chrome inside `DialogContent` or add `inDialog` variant; align radii with DS.
- Critique mapping: **T12**-adjacent polish (double surface); Allocate-specific.
- Classification: **independent**.
- Blocked by: (none in epic set)
- Blocks: (none listed)
- Likely implementation surface: **route/screen-specific** / small component (`PayCycleSetup.tsx`, dialog wiring).
- Suggested execution order: **Anytime** on Allocate; good quick win alongside **PRO-19** if touching same dialog flows — optional pairing to reduce QA passes.
- Notes: **Appropriately narrow**.

---

## Recommended implementation order

### 1. Foundational first (parallelise where safe)

- **PRO-20** — Token unification strategy (spike/phase 1 before repo-wide whack-a-mole).
- **PRO-8** — Serif page titles (**before PRO-13**).
- **PRO-9** — Numeric tiers (**before PRO-10, PRO-11, PRO-12, PRO-31**).
- **PRO-16** — DM Sans weight audit (early to avoid rework on headings/body).
- **PRO-17** — Targeted token hygiene (time-box; align with **PRO-20** direction).
- **PRO-18** — Sidebar width.
- **PRO-15** — Mobile tab bar (dedicated QA; can parallel other tracks with discipline).

### 2. Dependent tickets (respect blockers)

- After **PRO-9**: **PRO-10**, **PRO-11**, **PRO-12**, **PRO-31**.
- After **PRO-8**: **PRO-13**.
- After **PRO-12**: **PRO-14**, **PRO-19**, **PRO-35**.
- After **PRO-11**: **PRO-33**.
- After **PRO-10**: **PRO-34**.
- After **PRO-31**: **PRO-32**.
- After **PRO-24**: **PRO-25**, **PRO-21**.
- After **PRO-26**: **PRO-22** (for completion per epic).

### 3. Independent local tickets (slot around critical path)

- **Overview:** **PRO-23**, **PRO-24** (early), **PRO-26** (early if ping removal urgent), **PRO-36** anytime.
- **Holdings:** **PRO-27**, **PRO-28**, **PRO-29** (cluster QA).
- **Recurring:** **PRO-30** early in Recurring track.
- **Allocate:** **PRO-36** as small win.

### 4. Blocked / not ready until prerequisites


| Ticket                | Not ready until                         |
| --------------------- | --------------------------------------- |
| **PRO-10**            | **PRO-9**                               |
| **PRO-11**            | **PRO-9**                               |
| **PRO-12**            | **PRO-9**                               |
| **PRO-31**            | **PRO-9**                               |
| **PRO-13**            | **PRO-8**                               |
| **PRO-14**            | **PRO-12** (and transitively **PRO-9**) |
| **PRO-19**            | **PRO-12**                              |
| **PRO-35**            | **PRO-12**                              |
| **PRO-33**            | **PRO-11**                              |
| **PRO-34**            | **PRO-10**                              |
| **PRO-32**            | **PRO-31**                              |
| **PRO-25**            | **PRO-24**                              |
| **PRO-21**            | **PRO-24**                              |
| **PRO-22** “complete” | **PRO-26** (per epic intent)            |


---

## Consolidation opportunities

- **PRO-10 + PRO-34**: Allocate hero and pay-date deduplication both touch `TransfersPage` / `TransferSuggestions` — one implementation pass if team wants fewer Allocate context switches (watch ticket boundaries and review size).
- **PRO-11 + PRO-33**: Surplus card + contextual CTA — sequential dependency; consider same assignee back-to-back.
- **PRO-12 + PRO-14 + PRO-35**: Allocate list + shortfall + `CashFlowSummary` heading — same screen QA session after **PRO-12**.
- **PRO-24 + PRO-25 + PRO-21**: Overview structure → skeleton → spacing — strict sequence per epic; treat as one “Overview layout” milestone with three PRs if needed.
- **PRO-26 + PRO-22**: Ping removal (**PRO-26**) plus motion baseline (**PRO-22**) — coordinate DoD so motion work is not “done” while FAB still pings.
- **PRO-27 + PRO-28 + PRO-29**: Holdings cluster — shared page file and section components; single QA pass.
- **PRO-30 + PRO-31 + PRO-32**: Recurring — shared `BudgetPage` / breakdown; **PRO-30** before **PRO-31** reduces state thrash; **PRO-32** last.
- **PRO-16 + PRO-8 + PRO-13**: Typography wave — combine grep/audit for sans weights with serif title work to avoid fighting emphasis rules.
- **PRO-17 + PRO-20**: Avoid duplicate token migrations — agree owner or merge strategy before wide grep fixes.

---

## Risks

- **Linear relations empty vs epic table**: If `blockedBy` is not mirrored in Linear graph, agents may miss dependencies — **treat this doc + PRO-7 description as authoritative** until relations exist.
- **PRO-20 vs PRO-17**: Parallel token fixes without canonical strategy → churn and inconsistent `--warning` / semantic colours.
- **PRO-9 after large UI work**: Implementing income/surplus/rows (**PRO-10–12, 31**) before tiers forces class re-plumbing twice.
- **PRO-21 before PRO-24**: Wasted spacing work when card flattening changes vertical composition.
- **PRO-22 marked done while PRO-26 open**: Violates epic intent; ping remains primary motion.
- **PRO-32 scope**: Single ticket may be **too broad** for safe review — split by flow (income vs expense) if velocity suffers.
- **PRO-15 mobile tab bar**: Cross-route regression risk; deserves its own test checklist and possibly feature flag.
- **PRO-19 inline edit**: Easy to ship with incomplete cancel/restore behaviour — high trust risk on financial data.

---

## Notes for ticket planning agents

### Dependency checking

- Read **PRO-7** epic table first; for each ticket, copy **Blocked by** / **Blocks** into mini-plan.
- If implementing Allocate, trace **PRO-9 → PRO-12** chain before **PRO-14**, **PRO-19**, **PRO-35**.
- If implementing Overview rhythm, enforce **PRO-24 → PRO-25 / PRO-21**.

### Deciding local vs shared fix

- If critique index theme is **T14**, **T2**, **T7**, **T8**, **T9** → default **shared primitive** or shell component.
- If ticket maps to **T16**, **T15**, **T17** screen bullets → start **route/screen-specific**; escalate to shared only if same JSX pattern repeats twice.
- When **“token bypass”** appears (**T11**), fix the **semantic primitive** (warning/danger) if more than one file uses the same raw colour.

### Minimising file/code inspection

- Use [design-critique-index.md](design-critique-index.md) theme IDs to open **only** files listed there and in the Linear ticket body.
- Do not re-read full [design-critique.md](design-critique.md) for routine tickets.
- For tier work (**T2**), inspect `index.css` + one representative consumer per screen type, then apply pattern.

### When to stop and mark blocked

- **Upstream blocker incomplete** (e.g. **PRO-19** while **PRO-12** open) → stop; do not fork temporary row markup.
- **PRO-20 undecided** but ticket needs canonical token for new semantic colour → flag **blocked-by-token-strategy** rather than inventing a third convention.
- **DESIGN GAP** copy or IA (**PRO-32**, empty state copy in **PRO-13**, **PRO-26** replacement pattern) → blocked on product/design answer if spec is silent.
- **Conflicting tickets** in same file assigned in parallel → mark blocked on sibling or coordinate serial merge order.
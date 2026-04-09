# Design critique index (implementation-oriented)

**Source:** [design-critique.md](design-critique.md). **Canonical spec:** [public/design-system-v2.html](../public/design-system-v2.html).

**Diagnosis:** The product’s documented design system (DS v2 HTML) is strong and aligned with the reference direction; the shipped UI mostly diverges from it. Work is predominantly **spec fidelity / adoption**, not inventing a new visual language. Use **SPEC DEVIATION** when the HTML spec already defines the fix; use **DESIGN GAP** when behaviour, copy, or IA still needs product or new pattern decisions.

---

## DS deviation quick lookup (DS-1 … DS-11)

| ID | One-line issue | Spec area (see HTML) |
|----|----------------|----------------------|
| **DS-1** | Page `<h1>`s use sans/bold utilities instead of `.page-title` (Instrument Serif, 28px, -0.02em tracking). | Authenticated shell — `.page-title` |
| **DS-2** | Mobile uses hamburger + `MobileNav` drawer instead of fixed 56px bottom tab bar (5 items; Allocate centre). | Authenticated shell — mobile tab bar |
| **DS-3** | Single `.metric-value` tier used everywhere; spec defines `num-display`, `num-balance`, `num-body`. | Data display — numeric tiers |
| **DS-4** | Income not using `.income-card` (accent bg, white type, serif amount). | Cards — income card |
| **DS-5** | Surplus not using `.surplus-card` (accent-light bg, border, serif amount in accent). | Cards — surplus / allocation |
| **DS-6** | Allocate rows ad-hoc; spec defines `.alloc-row` (icon, name, account sublabel, amount, optional progress). | Cards — allocation row |
| **DS-7** | Empty state titles sans; spec `.empty-state-title` serif 20px + copy rules (no “nothing here”). | Empty states |
| **DS-8** | Negative surplus: should use `alert-danger`, surplus in `var(--danger)`, hide destination prompt; not a small uppercase label. | Authenticated — states table |
| **DS-9** | DM Sans limited to 300–500 in spec; `font-bold` (700) leaks despite tokens mapping bold→500. | Typography — weight rules |
| **DS-10** | Sidebar width 192px (`w-48` / `--sidebar-width`) vs `--shell-sidebar-w: 220px`. | Tokens / shell |
| **DS-11** | Allocate inline edit mode (badge, inline currency inputs, Update/Cancel) not built; modal pay-cycle edit only. | Advanced patterns — inline edit |

---

## T1 — Serif page titles

### Problem
Authenticated pages render `<h1>` with DM Sans + responsive `text-h1-*` + `font-bold` instead of the spec’s serif page title treatment.

### Why it matters
Establishes typographic identity on every load; mismatch makes the product read as generic UI kit rather than the documented brand voice.

### Affected surfaces
- **Routes:** `/app`, `/app/dashboard`, `/app/wealth`, `/app/budget`, `/app/transfers`
- **Files:** `DashboardPage.tsx`, `WealthPage.tsx`, `BudgetPage.tsx`, `TransfersPage.tsx`

### Recommended changes
- Apply spec-equivalent: `font-serif`, fixed title size ~28px, `tracking-[-0.02em]`, weight per DS (avoid sans `font-bold` on the title).
- Centralise if possible (layout wrapper or shared page header primitive) so all authenticated pages stay aligned.

### Change scope
`mixed` (token/CSS + all main feature pages)

### Likely dependencies
DS typography tokens; **T7** (weight discipline) to avoid reintroducing 700 on headings.

### Validation heuristics
- Every primary page `<h1>` uses the serif stack and matches DS `.page-title` sizing/tracking.
- No regression: title still one per page, accessible order unchanged.

---

## T2 — Three numeric display tiers

### Problem
`.metric-value` (serif 32px) flattens hierarchy: hero amounts, section totals, market figures, and row values compete equally.

### Why it matters
Financial products need clear primacy (what to trust first); one tier erodes scanability and perceived clarity.

### Affected surfaces
- **Overview:** `BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`, `NetWorthCard` (and related metric usage)
- **Holdings:** `WealthBreakdown`
- **Recurring / Allocate:** any shared breakdown rows using the same class pattern
- **CSS:** `index.css` (`.metric-value` definition and new tier classes)

### Recommended changes
- Implement `num-display` (32px serif), `num-balance` (24px serif), `num-body` (15px sans weight 500) per HTML spec.
- **Apply:** e.g. net worth → display; section totals → balance; market/inline/row → body (per critique mapping).

### Change scope
`shared primitive`

### Likely dependencies
**T7** (weights); **T14** if tier classes must compose with token strategy.

### Validation heuristics
- At least three visually distinct numeric levels exist in CSS and are used intentionally.
- Net worth (or each screen’s single primary KPI) uses display tier only once per logical “hero” region.
- Row/subordinate figures use `num-body` and do not match hero size.

---

## T3 — Income card and surplus card patterns

### Problem
Income and surplus use generic white cards / flat rows; spec defines distinct `.income-card` and `.surplus-card` treatments for hierarchy and meaning.

### Why it matters
Surplus and income are decision-driving; equal styling to expenses obscures accounting story and weakens trust.

### Affected surfaces
- **Overview:** `BudgetBreakdownTile.tsx`
- **Recurring:** `BudgetBreakdown.tsx`, `BudgetPage.tsx`
- **Allocate:** `TransfersPage.tsx`, `TransferSuggestions.tsx` (hero + list footer per critique)

### Recommended changes
- Build or reuse CSS/components matching DS: income = accent bg, white type, serif amount; surplus = accent-light bg, border, serif amount in accent colour.
- Replace triple identical metric tiles where spec calls for two special surfaces + one standard metric treatment.

### Change scope
`mixed` (shared pattern + multiple call sites)

### Likely dependencies
**T2** (amount sizing inside cards); **T14** for colour tokens; **T12** if restructuring removes nested cards.

### Validation heuristics
- Income and surplus are visually distinct from each other and from generic expense/commit rows.
- Colours come from DS accent/accent-light (not ad-hoc Tailwind palette).

---

## T4 — Allocation row pattern

### Problem
`TransferSuggestionRow` / `TransferSuggestions` layout does not follow `.alloc-row` structure (icon, labels, amount, optional progress).

### Why it matters
Allocate is spec-heavy; ad-hoc rows read as inconsistent and harder to extend (progress, accounts, icons).

### Affected surfaces
- **Route:** `/app/transfers`
- **Files:** `TransferSuggestionRow.tsx`, `TransferSuggestions.tsx`

### Recommended changes
- Refactor rows to match DS markup/classes: `.alloc-icon`, name, `.alloc-acct` sublabel, `.alloc-amount`, optional `.progress-bar`.
- Align icon containers with DS icon sizing/background tokens where applicable.

### Change scope
`shared component`

### Likely dependencies
**T2** for amount tier in rows; **T11** for tokenised borders/fills.

### Validation heuristics
- Row structure matches spec diagram; keyboard/focus order remains logical.
- Progress states render when data supports them without one-off CSS per row.

---

## T5 — Empty states (serif titles and copy)

### Problem
Empty state headings use sans; copy sometimes describes absence (“add X to see…”) vs value-forward guidance in spec.

### Why it matters
Empty regions read as afterthoughts; weak hierarchy and copy reduce clarity and onboarding quality.

### Affected surfaces
- **Overview / Holdings / Recurring** breakdown tiles: components referenced in critique for `DashboardPage`, `WealthPage`, `BudgetPage` empty regions

### Recommended changes
- Apply `.empty-state-title` equivalent: serif, 20px.
- Audit copy against DS rule: avoid “No results” / “Nothing here” patterns; prefer constructive next-step tone per feature copy doc if available.

### Change scope
`mixed` (shared empty-state pattern + per-feature copy)

### Likely dependencies
**T1** (serif loading); product/copy sign-off for DESIGN GAP wording.

### Validation heuristics
- All major tile empty headings use serif 20px equivalent.
- Copy reviewed for banned patterns; CTAs still visible and actionable.

---

## T6 — Negative surplus (shortfall) state

### Problem
Shortfall uses a small uppercase `SectionLabel` style instead of danger styling + `alert-danger` banner + hidden destination prompt per spec.

### Why it matters
Shortfall is a risk state; under-emphasis can cause users to miss solvency problems; wrong prompts erode trust.

### Affected surfaces
- **Allocate:** `TransferSuggestions.tsx` (shortfall branch)

### Recommended changes
- Implement DS table: surplus amount `var(--danger)`; banner above plan using danger alert variant; hide destination prompt in this state.

### Change scope
`local` (screen-level, may reuse shared `Alert`)

### Likely dependencies
Shared `Alert` / tokenised danger styles (**T11**, **T14**).

### Validation heuristics
- In shortfall: visible danger alert, numeric surplus in danger colour, no destination prompt.
- Non-shortfall: prior behaviour preserved.

---

## T7 — DM Sans weight discipline

### Problem
Spec caps DM Sans at 500; Tailwind `font-bold` resolves to 700 in places, overriding the intent of shared CSS variables.

### Why it matters
Creates heavy, generic UI; contradicts documented refined typographic rhythm.

### Affected surfaces
- **Global:** `index.css` (weight tokens)
- **Widespread:** any component using `font-bold` on sans text

### Recommended changes
- Audit sans text: replace `font-bold`/`font-semibold` with DS-compliant weights (300 body, 400 labels, 500 emphasis max).
- Consider Tailwind config or utility aliases so “emphasis” cannot jump to 700 on DM Sans.

### Change scope
`shared primitive`

### Likely dependencies
**T14** if aligning token pipeline; **T1** for page titles often co-fixed with this audit.

### Validation heuristics
- Spot-check computed styles: DM Sans never 600/700 where spec forbids it.
- Visual pass: emphasis still readable without heavy blocks.

---

## T8 — Mobile bottom tab bar

### Problem
`Header` hamburger opens full-screen `MobileNav` dialog; spec requires fixed bottom tab bar (5 items, Allocate third/centre, 56px height).

### Why it matters
Thumb reach, IA clarity, and cross-screen consistency on mobile; affects every authenticated view.

### Affected surfaces
- **Files:** `Header.tsx`, `MobileNav.tsx`; shell/layout consumers

### Recommended changes
- Implement `.tab-bar` per HTML: five destinations (Overview, Holdings, Allocate, Recurring, More), correct order.
- Retire or narrow drawer to “More” only if spec allows; ensure safe areas and active states.

### Change scope
`shared component` / layout shell

### Likely dependencies
Routing/active link logic; **T9** for shell width consistency; possible **T14** for colours.

### Validation heuristics
- Below breakpoint: bottom bar always visible; Allocate is centre item.
- No full-screen nav as the primary mobile IA pattern unless explicitly revised as DESIGN GAP.

---

## T9 — Sidebar width (220px)

### Problem
Implementation uses 192px (`w-48` / `--sidebar-width`); spec `--shell-sidebar-w: 220px`.

### Why it matters
Minor but systemic shell misalignment; affects content width and density across desktop.

### Affected surfaces
- **Files:** `index.css`, `Sidebar.tsx`

### Recommended changes
- Set sidebar width tokens/classes to 220px expanded state per spec; verify collapsed width still matches DS if defined.

### Change scope
`shared primitive`

### Likely dependencies
None critical; coordinate with **T8** if shared shell tokens are refactored.

### Validation heuristics
- Expanded sidebar measures 220px; no horizontal scroll regressions; main content grid still aligns.

---

## T10 — Allocate inline edit mode

### Problem
Pay cycle / plan edits go through modal dialog; spec defines inline mode: header badge, amounts as compact currency inputs, primary “Update plan” + ghost “Cancel”.

### Why it matters
Major UX differentiator for Allocate; modals add friction for frequent payday adjustments.

### Affected surfaces
- **Files:** `TransfersPage.tsx`, `PayCycleSetup.tsx`, related suggestion row editing if any

### Recommended changes
- Implement DS “Adjusting your plan” pattern: toggle edit mode, inline fields on allocation rows, explicit save/cancel, preserve accessibility (labels, focus traps where needed).

### Change scope
`mixed` (screen workflow + possibly shared form primitives)

### Likely dependencies
**T4** row structure; **T11**/**T14** for inputs and tokens; may follow **T2** for read vs edit typography.

### Validation heuristics
- Users can adjust plan without modal for the primary flow described in spec.
- Escape/cancel restores prior values; errors surface inline or via alerts consistently.

---

## T11 — Token discipline (no raw palette bypass)

### Problem
Some components use raw Tailwind colours (e.g. yellow borders/backgrounds on warnings) instead of `--warning` / `--warning-light` and other DS tokens.

### Why it matters
Dark mode and brand consistency break; bypasses the same system **T14** wants to unify.

### Affected surfaces
- **Example called out:** `UnallocatedWarning.tsx`
- **Rule:** apply anywhere similar bypasses appear during implementation

### Recommended changes
- Replace hard-coded palette utilities with DS CSS variables from HTML spec.
- Document preferred token for each semantic (warning, danger, success).

### Change scope
`shared primitive` (per occurrence may be local files)

### Likely dependencies
**T14** for authoritative token source; design sign-off if tokens missing for an edge case.

### Validation heuristics
- Warning/danger surfaces use `var(--warning*)` / `var(--danger*)` (or documented aliases), not arbitrary Tailwind hue classes.
- Dark theme: surfaces still legible and on-brand.

---

## T12 — Card nesting and surface flattening

### Problem
Multiple Overview modules nest `.metric-tile` inside shadcn `<Card>`, producing double white borders and DS-unlike stacking. Spec examples show metric tiles as standalone or on subtle paper surfaces, not card-in-card.

### Why it matters
Visual noise, weaker section hierarchy, wasted density; reads as “template stacking” vs composed layout.

### Affected surfaces
- **Overview:** `NetWorthCard`, `BudgetBreakdownTile`, `ExpenseBreakdown`, `IncomeBreakdown`, `MarketSummary`, `DashboardPage` composition

### Recommended changes
- Flatten: one outer container per section or use paper-2-style backgrounds inside a single card; remove redundant inner card chrome.
- Align surfaces with DS examples (subtle `paper-2` distinction instead of stacked identical whites).

### Change scope
`mixed`

### Likely dependencies
**T3** (income/surplus may replace some inner tiles); **T13** for vertical rhythm after flattening.

### Validation heuristics
- No double identical card backgrounds for a single logical module.
- Tap targets and grouping remain clear; contrast passes basic accessibility checks.

---

## T13 — Vertical spacing rhythm (`--sp-*`)

### Problem
Overview uses uniform `space-y-6` while other screens use `space-y-12`; DS documents a spacing scale for varied rhythm (`--sp-3` … `--sp-20`).

### Why it matters
Uniform gaps flatten storytelling; major section transitions need more air than sibling widgets.

### Affected surfaces
- **Primary:** `DashboardPage.tsx` outer layout
- **Opportunity:** apply scale consistently on other pages when touching layout

### Recommended changes
- Map section gaps to tokens: tighter between paired siblings, larger between major topics (critique suggests e.g. `--sp-12` between major shifts, per DS section header guidance).

### Change scope
`shared primitive` (layout convention) with per-page application

### Likely dependencies
**T12** (re-layout); token access **T14**.

### Validation heuristics
- Major section breaks visibly larger than intra-card gaps.
- No single `space-y-*` applied blindly to entire page if spec calls for rhythm variety.

---

## T14 — Dual token system (shadcn HSL vs DS v2)

### Problem
Implementation mixes DS custom tokens (`--ink`, `--paper`, `--accent`, …) with shadcn HSL variables and Tailwind habits; path of least resistance drifts from spec.

### Why it matters
Root cause of recurring SPEC DEVIATION; undermines **T11**, colour usage, and long-term maintainability.

### Affected surfaces
- **Global:** components using `hsl(var(--card))`, `text-muted-foreground`, raw utilities vs DS classes

### Recommended changes
- Decide canonical layer: critique recommends DS v2 as source of truth; alias or migrate shadcn tokens; publish short migration rules for new UI.

### Change scope
`shared primitive` (foundational)

### Likely dependencies
Design/engineering agreement; may be phased.

### Validation heuristics
- New components default to DS tokens/classes per migration guide.
- Reduced instances of one-off colour/typography utilities on new PRs.

---

## T15 — Overview: placeholders, skeleton, SetupProgress FAB

### Problem
(1) “Latest News” / “Recent Transactions” placeholder cards equal weight to real insights. (2) Loading skeleton grid does not mirror real layout (e.g. four equal blocks vs hero + columns). (3) `SetupProgress` uses always-on `animate-ping` FAB — not in DS; distracting.

### Why it matters
Signal-to-noise, trust during loading, and calm UX; motion draws attention away from primary metrics.

### Affected surfaces
- **Files:** `DashboardPage.tsx`, `SetupProgress.tsx`

### Recommended changes
- Remove or demote placeholders until functional (e.g. single link row or hide sections).
- Rebuild skeleton to match hero + two-column + full-width structure.
- Replace FAB with inline progress (bar, steps, or dismissible row) per DS patterns.

### Change scope
`local` (Overview), except motion patterns may become shared

### Likely dependencies
**T19**; **T12**/**T13** if layout changes accompany skeleton update.

### Validation heuristics
- No placeholder cards at same visual weight as net worth.
- Skeleton layout matches loaded layout at key breakpoints.
- No perpetual ping animation at rest.

---

## T16 — Holdings: duplication, category chrome, grid, errors

### Problem
Total assets appears in `WealthBreakdown` and again in `AssetPortfolioSection`. Category headers use non-DS `bg-primary/10` icons at density that fights “selective accent”. Two-column category grid causes ragged heights. Errors may not propagate to breakdown totals (unreliable data without warning).

### Why it matters
Duplicate metrics confuse; noisy chrome hurts scanability; silent errors damage trust in money figures.

### Affected surfaces
- **Route:** `/app/wealth`
- **Files:** `WealthBreakdown.tsx`, `AssetPortfolioSection.tsx`, `AssetCategoryGroup.tsx`, `WealthPage.tsx`

### Recommended changes
- Remove redundant total tile from section where duplicate.
- Switch category header chrome to DS icon container tokens or remove icons; prefer single-column category stack per shell guidance.
- When `assetsError` (or equivalent), mark breakdown tiles stale / show DS alert-warning + status patterns.

### Change scope
`local` with small shared primitives for status treatment

### Likely dependencies
**T2** for totals display tier; **T11** for warning tokens.

### Validation heuristics
- Single authoritative total assets presentation per viewport logic agreed by product.
- Error states visible on aggregated totals when upstream data failed.
- Category layout: no ragged two-column mosaic if single column chosen.

---

## T17 — Recurring: frequency controls, hierarchy, modals, CTA

### Problem
Three separate frequency `<Select>`s for one mental model; `BudgetBreakdown` rows flat (savings/repayments should be subordinate to expenses); many modals for CRUD vs DS preference for inline/wizard for creation; “Plan transfers” only as low-contrast ghost header action.

### Why it matters
Cognitive load, arithmetic misunderstandings, and weak forward navigation for the core surplus → allocate journey.

### Affected surfaces
- **Route:** `/app/budget`
- **Files:** `BudgetPage.tsx`, `BudgetBreakdown.tsx`, `IncomeSection.tsx`, `ExpensesSection.tsx`

### Recommended changes
- One shared frequency control (page level); consider DS `.seg-control` pattern.
- Restructure breakdown: primary rows for income, total expenses, surplus; indent savings/repayments under expenses with `num-body` and “incl.” semantics per critique.
- Replace create/edit modals with inline expansion or side panel where feasible; keep modals primarily for destructive confirm.
- Add contextual surplus CTA block (surplus card + embedded “Plan transfers”) while retaining header ghost if spec requires.

### Change scope
`mixed`

### Likely dependencies
**T3** surplus card; **T2**; possible new shared segmented control; product approval for modal reduction (**DESIGN GAP**).

### Validation heuristics
- One frequency control visible per state model (no triple duplicate selects).
- Savings/repayments visually subordinate; user cannot mis-sum flat peers.
- Primary workflow to Allocate has at least one high-salience CTA in content, not only header ghost.

---

## T18 — Allocate: context duplication and hero/surplus framing

### Problem
Pay cycle date repeated between context strip and hero; lacks spec’d `.income-card` hero at top of suggestions; missing `.surplus-card` as list footer when surplus exists (overlaps **T3**).

### Why it matters
Redundant info adds noise; missing hero/surplus framing weakens payday clarity and alignment with reference.

### Affected surfaces
- **Files:** `TransfersPage.tsx`, `TransferSuggestions.tsx`

### Recommended changes
- Merge pay cycle context into hero/header block; eliminate duplicate date proximity.
- Implement income hero + surplus footer per **T3** / DS-4 / DS-5 (coordinate with T4 rows).

### Change scope
`local` (Allocate) + shared patterns from **T3**

### Likely dependencies
**T3**, **T4**, **T6**; **T2** for amounts.

### Validation heuristics
- Pay date appears once in above-the-fold hero context.
- Income hero and surplus footer present per spec when data conditions met.

---

## T19 — Motion baseline

### Problem
Little intentional motion except problematic `animate-ping`; DS references progress bar animation and accordion transitions.

### Why it matters
Calm, confident UI benefits from subtle feedback; absence feels inert; wrong motion feels alarming.

### Affected surfaces
- **Global/components:** progress bars, expand/collapse, skeleton → content; remove FAB ping (**T15**)

### Recommended changes
- Add minimal DS-aligned transitions (chevron rotate, bar fill, gentle opacity on content reveal).
- Avoid decorative infinite animations on primary screens.

### Change scope
`shared primitive` / component-level CSS

### Likely dependencies
**T12**/**T4** for surfaces that animate; token clarity **T14**.

### Validation heuristics
- No infinite attention-grabbing animations on dashboard at rest.
- Expand/collapse and progress visuals animate smoothly without layout shift regressions.

---

## Foundational areas likely to unblock multiple tickets

1. **Token system reconciliation (T14)** — canonical DS v2 vs shadcn/Tailwind drift; highest leverage, highest effort.
2. **Numeric tier primitive (T2)** — consistent hierarchy across Overview, Holdings, Budget, Allocate, market widgets.
3. **Typography + weight rules (T1, T5, T7)** — serif voice for titles/empty states + sans weight cap.
4. **Shell / responsive navigation (T8, T9)** — mobile IA and desktop sidebar width.
5. **Card/surface vocabulary + rhythm (T3, T12, T13)** — income/surplus/metric surfaces and vertical spacing.
6. **Motion baseline (T19)** — after removing harmful FAB ping, add deliberate micro-motion.

---

## Notes for ticket planning agents

- Map every Linear issue to **one or more theme IDs (T1–T19)** and **DS-#** when the work is a spec deviation.
- If work touches **T14**, classify early as **foundation** or explicitly **blocked** until token strategy is decided; avoid duplicating token fixes across tickets.
- Prefer **one primary implementation surface per ticket** unless multiple tickets truly share the same primitive (e.g. one ticket for all page titles).
- **SPEC DEVIATION:** acceptance = match `design-system-v2.html` (cite section). **DESIGN GAP:** requires product/design agreement (copy, IA, modal vs inline).
- Use this index + Linear dependencies as the source of truth for sequencing; **do not** re-ingest the full [design-critique.md](design-critique.md) for routine ticket work.

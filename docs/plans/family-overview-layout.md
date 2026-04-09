# Family plan: Overview layout

**Tickets covered:** PRO-24, PRO-23, PRO-26  
**Unlocks:** PRO-25 (skeleton), PRO-21 (spacing rhythm) — both blocked on PRO-24

---

## Scope

Three independent improvements to the Overview (Dashboard) screen that all share `DashboardPage.tsx` as their primary implementation surface. Must be sequenced to avoid file conflicts:

1. **PRO-24** (first) — Flatten card-in-card nesting across Overview metric tiles.
2. **PRO-23** (second) — Remove or demote placeholder cards (Latest News / Recent Transactions).
3. **PRO-26** (third) — Replace SetupProgress FAB with inline, non-overlay progress indicator.

PRO-24 is structural and may reshape component boundaries; run it first to avoid PRO-23 and PRO-26 operating on stale structure.

---

## Tickets covered

| Ticket | Title | Classification |
|--------|-------|----------------|
| PRO-24 | Overview: Flatten card-in-card nesting | Independent |
| PRO-23 | Overview: Remove/demote placeholder cards | Independent |
| PRO-26 | Overview: Replace SetupProgress FAB | Independent |

---

## Upstream design intent

- **T12 (PRO-24):** `<Card>` wrapping `.metric-tile` creates double white border + double background. DS specifies metric tiles as standalone or on subtle `paper-2` surface inside a single outer card — not card-in-card. Fix: use tinted inner surface (`bg-muted/30` or `var(--paper-2)`) or plain dividers inside one outer card shell.
- **T15/SC1 (PRO-23):** "Latest News" and "Recent Transactions" render as full equal-weight `<Card>` placeholders despite having no real data. They compete visually with Net Worth. Direction: remove sections entirely until functional, OR collapse to single-line footer link rows (lower visual weight).
- **T15/T19 (PRO-26):** Fixed `bottom-6 right-6` FAB with `animate-ping` is the only persistent motion in the app and contradicts calm design direction. Direction: replace with an inline dismissible progress bar/step indicator on the Overview page or a compact badge in the sidebar. Remove `animate-ping` immediately. Coordinate with PRO-22 (motion baseline) for overall completion.

---

## Shared implementation surface

### Primary
- `src/features/dashboard/DashboardPage.tsx` — all three tickets modify this file.

### PRO-24 component targets
- `src/features/dashboard/components/NetWorthCard.tsx` — likely has inner card chrome
- `src/features/dashboard/components/BudgetBreakdownTile.tsx` — metric-tile-in-card pattern
- `src/features/dashboard/components/ExpenseBreakdown.tsx` — same pattern
- `src/features/dashboard/components/IncomeBreakdown.tsx` — same pattern
- `src/features/dashboard/components/MarketSummary.tsx` — check for double cards
- `src/features/dashboard/components/AssetsBreakdown.tsx` — check for double cards
- `src/features/dashboard/components/LiabilitiesBreakdown.tsx` — check

### PRO-23 target
- `DashboardPage.tsx` only — remove/demote JSX blocks for placeholder cards.

### PRO-26 targets
- `src/features/dashboard/components/SetupProgress.tsx` — primary: remove FAB + ping, build inline replacement.
- `DashboardPage.tsx` — update placement of SetupProgress (move from fixed overlay to inline content area).

---

## Recommended implementation approach

### PRO-24 (structural first)
1. Inspect `DashboardPage.tsx` to understand the current component composition.
2. For each metric section component, check: does the component render a `<Card>` around inner `.metric-tile` content?
3. Apply one of two patterns per section:
   - **Option A (preferred for dense metric groups):** One outer `<Card>` / `div` with `border` + `rounded-xl`; inner items use `bg-[var(--paper-2)]` or `bg-muted/30` tinted surfaces separated by `<Separator />`.
   - **Option B (for standalone widgets):** Remove outer Card entirely; metric tile is flat on page background.
4. Preserve existing data bindings, loading states, and error states — only change surface/chrome.
5. Do not touch placeholder card sections (that's PRO-23) or SetupProgress (that's PRO-26).

### PRO-23 (after PRO-24)
1. In `DashboardPage.tsx`, locate the "Latest News" and "Recent Transactions" sections.
2. **Preferred:** Remove them entirely (cleaner signal/noise ratio; they can return when functional).
3. **Alternative:** Collapse to a single subtle footer row: `text-sm text-[var(--ink-3)] underline` links to the relevant feature areas.
4. Do not create new card chrome for the placeholder — that defeats the purpose.

### PRO-26 (after PRO-23)
1. In `SetupProgress.tsx`:
   - Remove the fixed-position FAB wrapper (`fixed bottom-6 right-6 ...`).
   - Remove `animate-ping` from the beacon/dot element.
   - Build inline variant: a dismissible horizontal progress strip or step counter row. Suggested: `border rounded-lg p-3 flex items-center gap-3` with a `<Progress>` bar (shadcn), step text "3 of 7 steps complete", and a dismiss (`×`) icon.
2. In `DashboardPage.tsx`, place the `<SetupProgress />` component inline in the content flow — either at the top of the page (above hero) or in a dedicated onboarding section below the hero. Not fixed-positioned.
3. If `SetupProgress` has a `completed` or `dismissed` state, ensure the inline version also hides gracefully.
4. Note: PRO-22 (motion baseline) is not "done" until this ping is removed. After this ticket merges, PRO-22's ping-removal criterion is satisfied.

---

## Risks / regression watchouts

- **PRO-24:** Removing Card chrome may break CSS that applies `rounded` or `shadow` to children expecting a Card ancestor. Inspect each component carefully.
- **PRO-24:** Inner components may pass `className` props that assume a Card parent layout. Check for `px-0 pb-0` or similar negative-margin patterns.
- **PRO-24:** Loading/skeleton states in `DashboardPage` must still work — verify `isLoading` branches after structural changes.
- **PRO-23:** Removing placeholder cards may expose layout gaps (e.g., empty space in a grid). If `DashboardPage` uses `grid-cols-2`, removing one card may leave an asymmetric layout. Adjust grid or wrapping layout accordingly.
- **PRO-26:** The FAB may be referenced in tests (e.g., `aria-label="setup"` or `data-testid`). Check test files for `SetupProgress` references before removing.
- **PRO-26:** If `SetupProgress` is visible to zero-setup users, the inline version must still feel prominent enough to drive onboarding completion. Verify against onboarding conversion intent.
- **Sequencing violation:** Do not merge PRO-23 or PRO-26 before PRO-24 if they've all been worked on in parallel branches — there will be merge conflicts on `DashboardPage.tsx`.

---

## Validation rules

### PRO-24
- [ ] No two identical white bordered card surfaces nested inside each other on Overview.
- [ ] Each metric section has one clear visual boundary (one `border` or `rounded` container).
- [ ] Inner metric content uses subtle tint or divider, not a second Card.
- [ ] Loading states still render correctly.

### PRO-23
- [ ] "Latest News" and "Recent Transactions" no longer appear as equal-weight cards.
- [ ] If kept as links: visual weight clearly subordinate to Net Worth and budget tiles.
- [ ] No layout gap or broken grid from removed sections.

### PRO-26
- [ ] No fixed-position overlay on the Overview page.
- [ ] No `animate-ping` or any persistent looping animation at rest.
- [ ] SetupProgress state (step count, dismiss) still functions correctly.
- [ ] Inline placement does not overlap content or require scroll to see primary metrics.

---

## Tickets unlocked

- **PRO-25** (Loading skeleton layout) — unblocked once PRO-24 finalises the structural composition (skeleton must mirror it).
- **PRO-21** (Varied vertical spacing rhythm) — unblocked once PRO-24 flattens the layout (no point re-spacing layout that's still nested double-cards).
- **PRO-22** (Motion baseline completion) — the ping-removal criterion is satisfied when PRO-26 lands.

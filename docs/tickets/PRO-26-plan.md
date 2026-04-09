# PRO-26 — Overview: Replace SetupProgress FAB with inline / non-overlay progress

## Ticket intent

Remove the fixed-position floating action button (FAB) and its `animate-ping` beacon from `SetupProgress.tsx`. Replace with an inline, dismissible horizontal progress strip rendered in the Dashboard content flow — between the page header and the first metric tile. The component retains its step count, progress percentage, expandable checklist, and dismiss-to-preferences logic; only the presentation surface and positioning change.

## Family plan reference

`/docs/plans/family-overview-layout.md` — PRO-26 is the third and final ticket in the Overview layout family (after PRO-24 and PRO-23). Removes the ping-beacon, satisfying the PRO-22 (motion baseline) DoD criterion.

## Critique mapping

- **T15** — Fixed FAB competes with thumb-zone UX; inline is less intrusive.
- **T19** — `animate-ping` is the only persistent looping animation in the app; contradicts calm design direction.
- **SC3** — Overlay patterns increase cognitive load; inline indicators live within the content hierarchy.

## Dependency assessment

- **PRO-24** ✅ completed — structural card flattening done, `DashboardPage.tsx` is stable.
- **PRO-23** ✅ completed — placeholder cards removed, content flow clean.
- No other blockers. Safe to implement.

## Files/components to inspect first

1. `src/features/dashboard/components/SetupProgress.tsx` — current FAB implementation with `fixed bottom-6 right-6 z-[110]` and `animate-ping` beacon; also contains an `AnimatePresence`-driven expandable panel at `fixed bottom-24 right-6 z-[100]`.
2. `src/features/dashboard/DashboardPage.tsx` — `<SetupProgress />` is already placed in JSX between the header and `<NetWorthCard>`. Because the component uses `fixed` internally, JSX placement currently has no visual effect; after the refactor, placement becomes meaningful.
3. `src/components/ui/progress.tsx` — shadcn `Progress` component available, use for the inline bar.

## Proposed implementation path

### `SetupProgress.tsx`

1. **Remove** the FAB wrapper: `<div className="fixed bottom-6 right-6 z-[110]">...</div>`.
2. **Remove** the `animate-ping` beacon span inside the FAB button.
3. **Remove** the fixed expandable panel: `<motion.div className="fixed bottom-24 right-6 z-[100] ...">`.
4. **Build inline variant:**
   - Outer wrapper: `<div className="rounded-lg border border-[var(--paper-3)] bg-[var(--paper-2)] overflow-hidden">`.
   - Summary strip (always visible): `flex items-center gap-3 p-3` with:
     - `CheckCircle2` or progress icon on the left.
     - Step text: `{completedCount} of {checklist.length} steps complete`.
     - `<Progress value={progress} />` bar in the middle (flex-1).
     - "View steps" / "Hide steps" toggle link (text-caption).
     - `×` dismiss button (calls `handleDismiss`).
   - Expandable checklist below the strip: retain existing `AnimatePresence` + `motion.div` with `height: 0 → auto` for the checklist items. Use `initial: false` to avoid entry animation on mount.
   - Keep the 🎉 completion banner at `progress === 100`.
5. **Remove** `isOpen`-toggle via FAB click; replace with inline "View steps" text button.
6. **Preserve** all data logic: `useUserPreferences`, `hideSetupChecklist` guard, `handleDismiss`, `expandedItem` toggle, `CHECKLIST_METADATA`.
7. **Loading skeleton:** Replace `fixed bottom-6 right-6` skeleton with an inline `Skeleton` bar matching the strip dimensions (`h-12 w-full rounded-lg`).

### `DashboardPage.tsx`

No placement change needed — `<SetupProgress />` is already between the header and `<NetWorthCard>` at line 300. After the component stops using `fixed` positioning, it will naturally slot into the content flow at this position. No JSX edits required.

## Risks / regression watchouts

- **Dismiss state:** `handleDismiss` calls `useUpdateUserPreferences.mutateAsync`; must verify the inline dismiss button still triggers this correctly with the new layout.
- **Loading state:** The old FAB skeleton used `fixed` too — new inline skeleton must have `w-full` not `w-14 h-14 rounded-full`.
- **Expandable checklist height transition:** The existing `height: 0 → "auto"` framer motion animation should still work; verify it doesn't get clipped by `overflow-hidden` on the outer container (may need `overflow-hidden` only on the summary strip, with the container being `overflow-visible`).
- **`isOpen` initial state:** Currently defaults to `false` (collapsed). The inline variant starts collapsed by default — expected. First incomplete item auto-expands when opened — preserve this.
- **Removed imports:** `ChevronUp` may no longer be needed in the same form if toggling becomes a text button; check and remove unused imports to keep the file clean.
- **z-index leakage:** Remove all `z-50`/`z-[100]`/`z-[110]` from the component entirely.

## Validation checklist

- [ ] No `fixed` positioning remains in `SetupProgress.tsx`.
- [ ] No `animate-ping` or any other looping CSS animation remains.
- [ ] No `z-50`, `z-[100]`, or `z-[110]` remains in the component.
- [ ] Inline banner renders between the page `<h1>` and `<NetWorthCard>` in the Dashboard content flow.
- [ ] `<Progress>` bar reflects actual `progress` prop value.
- [ ] Step count text is correct (e.g. "3 of 7 steps complete").
- [ ] "View steps" expands the checklist; toggle correctly hides/shows it.
- [ ] Dismiss (×) button calls `handleDismiss` and hides the component.
- [ ] When `preferences.hideSetupChecklist` is true, component returns null (existing behaviour preserved).
- [ ] Loading state renders an inline skeleton (not a circle/FAB skeleton).
- [ ] At `progress === 100`, 🎉 completion message is visible.
- [ ] No TypeScript or lint errors introduced.
- [ ] No unused imports left in the file.

## Implementation readiness

Ready

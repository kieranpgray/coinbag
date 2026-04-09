# PRO-26 Review — Overview: Replace SetupProgress FAB with inline / non-overlay progress

## Review verdict

Pass

## What is correct

### Positioning — FAB fully removed
All `fixed` positioning, `z-[110]`, `z-[100]`, and `z-50` classes have been eliminated from `SetupProgress.tsx`. A grep on the file returns zero matches. The component now renders as a normal block element in the document flow.

### Animation — `animate-ping` fully removed
The beacon dot (`<span className="animate-ping ...">`) and its wrapping container have been deleted. No persistent looping CSS animation remains in the component. PRO-22's ping-removal DoD criterion is now satisfied.

### Inline banner design
The new summary strip follows the ticket-specified layout:
- Left: `CheckCircle2` icon + step count text (`{n} of {total} steps complete`)
- Middle: `<Progress value={progress} className="flex-1 h-1.5" />` from shadcn (already in the project)
- Right: "View steps / Hide steps" toggle with `ChevronDown` rotation, and `×` dismiss button

Container uses `border border-[var(--paper-3)] bg-[var(--paper-2)] rounded-lg` as specified in the ticket direction.

### Expandable checklist preserved
The full checklist panel is retained as a collapsible inline section below the strip, using `AnimatePresence` with `initial={false}` and `height: 0 → auto` framer motion transitions. The auto-expand of the first incomplete item on open is preserved.

### Dismiss behaviour preserved
`handleDismiss` still calls `useUpdateUserPreferences.mutateAsync({ ...preferences, hideSetupChecklist: true })`. The `×` button in the summary strip triggers it. The `preferences?.hideSetupChecklist` guard at the top of the component still returns `null` when dismissed, preventing re-render.

### Loading state updated
Loading skeleton replaced from `fixed bottom-6 right-6 h-14 w-14 rounded-full` to `h-12 w-full rounded-lg` — matching the new inline strip dimensions.

### Completion state preserved
`progress === 100` renders the 🎉 completion banner within the expanded checklist panel.

### `DashboardPage.tsx`
`<SetupProgress />` was already placed between the `<header>` and `<NetWorthCard>` at the JSX level. No structural movement was needed — the placement is now meaningful because the component no longer self-applies fixed positioning. The misleading comment `"pinned sidebar overlay"` was updated to `"inline onboarding strip"`.

### Unused imports cleaned
`ChevronUp` (used in the old FAB panel) has been replaced with `ChevronDown` (used consistently for collapse toggles). No unused imports remain.

### `page-title` class preserved
`DashboardPage.tsx` `<h1 className="page-title">` introduced in PRO-8 is untouched.

## What is off

### Minor: Progress bar height on small screens
`h-1.5` on the `<Progress>` component produces a very thin (6px) bar on the summary strip. On narrow mobile viewports where the step text wraps, the bar's flex-grow could compress awkwardly. Not a blocker but worth a visual QA pass on <375px widths.

### Minor: Dismiss requires `preferences` to be loaded
`handleDismiss` returns early if `preferences` is `undefined` (i.e., while user preferences are still loading). If a user clicks `×` before preferences load, nothing happens and there's no feedback. This was present in the original code and not introduced by this ticket — flagged for future work only.

## Required fixes

None. The implementation satisfies all validation checklist items from the plan.

## Regression risks

- **Low:** The expandable checklist inner `overflow-hidden` on `motion.div` clips height transitions on initial enter correctly; tested via `initial={false}` on outer `AnimatePresence`.
- **Low:** The outer container uses `overflow-hidden` — this is correct for clipping the expand/collapse of the checklist. Framer motion's `height: auto` animation works correctly with this pattern because the clipping is on the animated child, not the outer wrapper.
- **None:** No impact on any other Dashboard components — the component's external interface (`progress`, `checklist`, `isLoading` props) is unchanged.

## Should this ticket be closed

Yes

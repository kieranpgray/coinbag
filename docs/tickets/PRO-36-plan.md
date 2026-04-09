# PRO-36 — Allocate: PayCycleSetup — avoid Card inside Dialog (double frame)

## Ticket intent

Remove the `<Card>` / `<CardHeader>` / `<CardContent>` wrapper from `PayCycleSetup` so that when the component is rendered inside a `<DialogContent>`, it does not produce a double-border / double-padding surface. `DialogContent` already supplies the modal chrome (background, border, radius, padding); wrapping the inner content in a `Card` adds a redundant second visual frame.

## Family plan reference

Part of the Supafolio design-uplift backlog (T-series polish tickets). Specifically targets the Allocate feature surface. No parent ticket; standalone polish item.

## Critique mapping

T12-adjacent double-surface polish. The `Card`-inside-`Dialog` pattern creates visual redundancy: two borders, two background layers, doubled padding. Fix brings the modal in line with the DS modal spec (`--rx: 20px`, single-surface chrome).

## Dependency assessment

No blockers. `PayCycleSetup` has one call-site inside a `<Dialog>` (edit flow in `TransfersPage`) and one standalone call-site (initial setup, rendered inline on the page). Both cases are handled by removing the Card wrappers and letting the content stand alone. No upstream ticket required.

## Files/components to inspect first

- `src/features/transfers/components/PayCycleSetup.tsx` — wraps all states (loading, no-accounts, main form) in `<Card>`.
- `src/features/transfers/TransfersPage.tsx` — dialog at ~line 185; also standalone render at ~line 89.

**Findings from inspection:**

`PayCycleSetup` has three render paths, each wrapped in `<Card>`:
1. **Loading state** (lines 78–85) — `<Card><CardHeader><CardTitle>` / `<CardDescription>`.
2. **No-accounts state** (lines 88–104) — `<Card><CardHeader>` + `<CardContent><Alert>`.
3. **Main form** (lines 107–237) — `<Card><CardHeader>` + `<CardContent><form>`.

`TransfersPage` uses `PayCycleSetup` in two places:
- Line 89: standalone page render (no dialog) — removing Card leaves content flat on page, which is correct given the surrounding `space-y-12` container.
- Line 190: inside `<DialogContent className="sm:max-w-[600px]">` — `DialogContent` already has border, background, padding and radius; Card is redundant here.

`TransfersPage`'s `DialogContent` already renders a `<DialogHeader><DialogTitle>Edit Pay Cycle</DialogTitle></DialogHeader>` — the `CardTitle` ("Set Up Your Pay Cycle") inside `PayCycleSetup` is also duplicated in the dialog context. After removal, the `CardTitle` text in `PayCycleSetup` should be rendered only as a supporting description or subheading (used as the `CardDescription` already covers the subtitle role).

## Proposed implementation path

### `PayCycleSetup.tsx`

1. Remove imports: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` from `@/components/ui/card`.
2. **Loading state**: Replace `<Card><CardHeader><CardTitle>…</CardTitle><CardDescription>…</CardDescription></CardHeader></Card>` with `<div className="py-2 space-y-1"><p className="text-base font-medium">Set Up Your Pay Cycle</p><p className="text-sm text-muted-foreground">Loading accounts…</p></div>`.
3. **No-accounts state**: Replace `<Card><CardHeader>…</CardHeader><CardContent>…</CardContent></Card>` with `<div className="space-y-4"><div className="space-y-1">…heading/description…</div><Alert>…</Alert></div>`.
4. **Main form**: Strip `<Card>`, `<CardHeader>`, `<CardContent>`. Retain `<CardDescription>` text as a plain `<p className="text-sm text-muted-foreground">` subtitle above the form, and `<CardTitle>` text as `<p className="text-base font-medium">`. Wrap in `<div className="space-y-6">`.

### `TransfersPage.tsx`

No changes required. `DialogContent` already provides the correct chrome. The `DialogTitle` ("Edit Pay Cycle") is already supplied by `DialogHeader` — removing the inner `CardTitle` from `PayCycleSetup` resolves the title duplication within the dialog.

## Risks / regression watchouts

- **Standalone page render** (line 89): With `Card` removed, form renders flat. Must confirm spacing/readability is acceptable without a card surface in the initial-setup flow.
- **Title duplication in dialog**: `PayCycleSetup` previously showed "Set Up Your Pay Cycle" as `CardTitle` inside the dialog that already has "Edit Pay Cycle" as `DialogTitle`. After removal, this is cleanly resolved.
- **Loading + no-accounts states**: These are shown both inside and outside the dialog — both contexts benefit from no Card wrapper.
- **No functional changes** to form logic, validation, submission, or hooks.

## Validation checklist

- [ ] `PayCycleSetup` rendered inside dialog: single border/background surface — no double frame visible.
- [ ] `PayCycleSetup` rendered standalone (initial setup, no pay cycle): content displays correctly with appropriate spacing.
- [ ] Loading state: renders without Card chrome.
- [ ] No-accounts state: Alert is visible, layout is clean.
- [ ] Form submission works (happy path + error state).
- [ ] No TypeScript or lint errors introduced.
- [ ] `Card`-related imports fully removed from `PayCycleSetup.tsx`.

## Implementation readiness

`Ready`

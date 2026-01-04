# Component Migration Guide: Atlassian Design System Styling

This document describes the migration of Select and Input components to match Atlassian Design System styling.

## Overview

All dropdown menus (Select components) and text entry fields (Input components) have been updated to match Atlassian Design System styling. The changes include:

- Cleaner borders and subtle focus states
- Improved hover states
- Better visual consistency across all forms
- New clear-on-focus functionality for prefilled values

## Input Component Changes

### New Props

The Input component now supports two new optional props:

#### `clearOnFocus?: boolean`

If true, clears the input value when focused if it matches `clearValue`. Useful for prefilled values like $0 that should disappear when the user clicks into the field.

#### `clearValue?: string | number`

The value to clear when `clearOnFocus` is true and the input is focused. Can be a string or number (e.g., 0, "0", "0.00").

### Usage Example

```tsx
// Before: Prefilled $0 value stays visible
<Input
  type="number"
  {...register('amount', { valueAsNumber: true })}
  placeholder="0.00"
/>

// After: Prefilled $0 value clears on focus
<Input
  type="number"
  clearOnFocus
  clearValue={0}
  placeholder="0.00"
  {...register('amount', { valueAsNumber: true })}
/>
```

### Migration Notes

- **Backward Compatible**: All existing Input usage continues to work without changes
- **No Breaking Changes**: Existing props and behavior remain unchanged
- **Optional Feature**: Clear-on-focus is opt-in via props

## Select Component Changes

### Styling Updates

The Select component has been updated with Atlassian Design System styling:

- Cleaner borders (subtle gray borders)
- Subtle focus rings (not heavy outlines)
- Improved hover states
- Better selected state indication

### Migration Notes

- **Backward Compatible**: All existing Select usage continues to work without changes
- **No Breaking Changes**: All props and behavior remain unchanged
- **Automatic**: Styling updates apply automatically to all Select components

## Forms Updated

The following forms have been updated:

1. **GoalForm** - Added clear-on-focus for `currentAmount` and `targetAmount` fields
2. **IncomePage** - Added clear-on-focus for `amount` field (create & edit modals)
3. **AssetForm** - Added clear-on-focus for `value` field
4. **LiabilityForm** - Added clear-on-focus for `balance`, `interestRate`, and `monthlyPayment` fields
5. **SubscriptionForm** - Styling updates (no clear-on-focus needed)
6. **CategoryForm** - Styling updates (no clear-on-focus needed)
7. **CategoryInput** - Custom dropdown updated to match Atlassian Select styling

## Testing

All forms have been tested for:
- Visual consistency with Atlassian Design System
- Clear-on-focus behavior for prefilled values
- Form validation and submission
- Keyboard navigation
- Accessibility (WCAG 2.1 AA compliance)

## Rollback

If needed, rollback can be performed by reverting the following commits:
- Component styling updates in `src/components/ui/select.tsx` and `src/components/ui/input.tsx`
- Form updates in `src/features/*/components/*Form.tsx` files

See git history for specific commit hashes.



# Fix Net Worth Chart Date Range and X-Axis Implementation Plan

## Overview

Fix inconsistent mocked data and incorrect X-axis year labels (duplicates or missing years) in the net worth chart. Align date range calculation, mocked data generation, and X-axis tick positioning to ensure the 5y view shows exactly 5 calendar years with evenly spaced, non-duplicate year labels.

## Problem Analysis

**Root Causes:**
1. **Date Range Mismatch**: `useNetWorthHistory` generates 1825 days of data (may span 6 calendar years), while `NetWorthCard` filters 5y using calendar year boundaries (5 calendar years)
2. **X-Axis Tick Misalignment**: For 5y view, `xAxisTicks` uses evenly spaced indices that don't align with year boundaries
3. **Year Boundary Gaps**: `sampleMonthly` includes Jan 1 points, but tick calculation doesn't guarantee those points are selected
4. **Data Generation Inconsistency**: Mocked data uses exact day counts (1825 days) while filtering uses calendar boundaries

## Implementation Details

### 1. Align Mocked Data Generation with Calendar Year Boundaries

**File: `src/features/dashboard/hooks/useNetWorthHistory.ts`**

- Modify mocked data generation to use calendar year boundaries instead of exact day counts
- Change the generation loop to start from `startOfYear(currentYear - 4)` instead of `subDays(today, MAX_HISTORY_DAYS)`
- Import `startOfYear` from `date-fns` if not already imported
- Update the loop to generate data from January 1st of 5 calendar years ago to today
- Ensure this matches the filtering logic in `NetWorthCard` (line 54)

**Code Pattern:**
```typescript
// Replace: const fiveYearsAgo = subDays(today, MAX_HISTORY_DAYS);
// With: const fiveYearsAgo = startOfYear(new Date(today.getFullYear() - 4, 0, 1));
```

### 2. Fix X-Axis Tick Calculation to Use Year Boundaries

**File: `src/features/dashboard/components/NetWorthChart.tsx`**

- Modify `xAxisTicks` calculation (lines 82-120) for 5y view
- Instead of evenly spaced indices, find the first data point for each unique year
- Create a function that:
  1. Extracts all unique years from filtered data
  2. Finds the first data point for each year
  3. Uses those specific dates as ticks
  4. Falls back to evenly spaced if year boundaries aren't found
- Ensure each year appears exactly once

**Implementation Approach:**
```typescript
if (timePeriod === '5y') {
  // Get all unique years in filtered data, sorted
  const years = Array.from(new Set(
    data.map(point => new Date(point.date).getFullYear())
  )).sort((a, b) => a - b);
  
  // Find first data point for each year
  const yearTicks = years.map(year => {
    return data.find(point => new Date(point.date).getFullYear() === year)?.date;
  }).filter((date): date is string => date !== undefined);
  
  // Use year boundaries if we found all years, otherwise fallback
  if (yearTicks.length === years.length && years.length >= 4) {
    return yearTicks;
  }
  
  // Fallback to evenly spaced (existing logic)
}
```

### 3. Enhance Year Boundary Sampling

**File: `src/features/dashboard/hooks/useNetWorthHistory.ts`**

- Verify `sampleMonthly` function (lines 321-369) always includes Jan 1 for each year
- Ensure the year boundary check (line 351) works correctly for all edge cases
- Add validation to ensure at least one point exists per year after sampling
- Consider adding a post-processing step to guarantee year boundary points exist

### 4. Add Validation and Error Handling

**Files: `src/features/dashboard/hooks/useNetWorthHistory.ts` and `src/features/dashboard/components/NetWorthChart.tsx`**

- Add validation in `filteredHistoryData` (NetWorthCard.tsx) to verify 5y filtered data contains expected years
- Add console warnings (in development) if year boundaries are missing
- Add defensive checks in `xAxisTicks` calculation to handle edge cases
- Document the calendar year vs day count distinction in comments

### 5. Test Edge Cases

- Test when today is early in year (e.g., Feb 2026 → should show 2022-2026)
- Test when today is late in year (e.g., Dec 2026 → should show 2022-2026)
- Test with insufficient data (e.g., only 2 years when 5y selected)
- Test year transitions (e.g., when current date is Jan 1)
- Test with zero or negative net worth values

## Files to Modify

1. **`src/features/dashboard/hooks/useNetWorthHistory.ts`**
   - Lines 70-74: Update date range calculation for mocked data generation
   - Lines 161-162: Change loop to use calendar year boundaries
   - Lines 321-369: Verify and enhance `sampleMonthly` year boundary logic

2. **`src/features/dashboard/components/NetWorthChart.tsx`**
   - Lines 82-120: Rewrite `xAxisTicks` calculation for 5y view to use year boundaries

3. **`src/features/dashboard/components/NetWorthCard.tsx`**
   - Lines 42-64: Add validation to `filteredHistoryData` (optional but recommended)

## Success Criteria

- ✅ 5y view always shows exactly 5 calendar years (e.g., 2022-2026 when today is in 2026)
- ✅ Each year label appears exactly once on X-axis
- ✅ Years are evenly spaced visually
- ✅ Mocked data generation aligns with filtering logic
- ✅ No duplicate or missing years in any scenario
- ✅ Works correctly regardless of current date within the year

## Testing Checklist

- [ ] 5y view shows correct 5 calendar years
- [ ] No duplicate year labels on X-axis
- [ ] No missing year labels on X-axis
- [ ] Years are evenly spaced
- [ ] Works on Jan 1 of any year
- [ ] Works on Dec 31 of any year
- [ ] Handles edge cases (insufficient data, zero net worth)
- [ ] No console errors or warnings

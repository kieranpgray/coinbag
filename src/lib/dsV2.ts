/**
 * Build-time flag mirroring `<html data-ds="v2">` (set in main.tsx when VITE_DS_V2=true).
 * Use for conditional DS v2 layout/typography classes alongside CSS `[data-ds='v2']` rules.
 */
export const isDsV2 = import.meta.env.VITE_DS_V2 === 'true';

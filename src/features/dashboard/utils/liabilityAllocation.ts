import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  CreditCard,
  Package,
} from 'lucide-react';
import type { LiabilityBreakdown } from '@/types/domain';

/**
 * Color mapping for liability types
 * Uses red theme hex values that work in both light and dark modes
 */
const LIABILITY_TYPE_COLORS: Record<LiabilityBreakdown['category'], string> = {
  'Loans': '#DC2626', // red-600, primary red
  'Credit Cards': '#EF4444', // red-500, medium red
  'Other': '#F87171', // red-400, lighter red
};

/**
 * Icon mapping for liability types
 * Uses Lucide React icons
 */
const LIABILITY_TYPE_ICONS: Record<LiabilityBreakdown['category'], LucideIcon> = {
  'Loans': FileText,
  'Credit Cards': CreditCard,
  'Other': Package,
};

/**
 * Chart data format for Recharts PieChart
 */
export interface ChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

/**
 * List data format for LiabilitiesAllocationList component
 */
export interface ListData {
  category: string;
  value: number;
  percentage: number;
  icon: LucideIcon;
  color: string;
}

/**
 * Get color for a liability type
 * Falls back to 'Other' color if type is not found
 */
export function getLiabilityTypeColor(type: LiabilityBreakdown['category']): string {
  return LIABILITY_TYPE_COLORS[type] ?? LIABILITY_TYPE_COLORS['Other'];
}

/**
 * Get icon component for a liability type
 * Falls back to 'Other' icon if type is not found
 */
export function getLiabilityTypeIcon(type: LiabilityBreakdown['category']): LucideIcon {
  return LIABILITY_TYPE_ICONS[type] ?? LIABILITY_TYPE_ICONS['Other'];
}

/**
 * Normalize percentages to ensure they sum to exactly 100%
 * Handles rounding errors by adjusting the largest category
 */
export function normalizePercentages(breakdown: LiabilityBreakdown[]): LiabilityBreakdown[] {
  if (breakdown.length === 0) return breakdown;

  // Calculate current sum
  const currentSum = breakdown.reduce((sum, item) => sum + item.percentage, 0);
  const difference = 100 - currentSum;

  // If already 100%, return as-is
  if (difference === 0) return breakdown;

  // Find the largest category by balance (not percentage, to preserve accuracy)
  const largestIndex = breakdown.reduce(
    (maxIndex, item, index) =>
      item.balance > breakdown[maxIndex]!.balance ? index : maxIndex,
    0
  );

  // Adjust the largest category
  const adjusted = [...breakdown];
  adjusted[largestIndex] = {
    ...adjusted[largestIndex]!,
    percentage: adjusted[largestIndex]!.percentage + difference,
  };

  // Ensure percentage doesn't go negative or over 100
  if (adjusted[largestIndex]!.percentage < 0) {
    adjusted[largestIndex]!.percentage = 0;
  } else if (adjusted[largestIndex]!.percentage > 100) {
    adjusted[largestIndex]!.percentage = 100;
  }

  return adjusted;
}

/**
 * Transform breakdown data for chart display
 * Adds colors and normalizes percentages
 * Uses balance field from LiabilityBreakdown as the value for chart
 */
export function transformBreakdownForChart(breakdown: LiabilityBreakdown[]): ChartData[] {
  const normalized = normalizePercentages(breakdown);

  return normalized.map((item) => ({
    name: item.category,
    value: item.balance,
    color: getLiabilityTypeColor(item.category),
    percentage: item.percentage,
  }));
}

/**
 * Transform breakdown data for list display
 * Adds icons, formats for list, handles < 1% display, and sorts
 * Uses balance field from LiabilityBreakdown as the value for list
 */
export function transformBreakdownForList(breakdown: LiabilityBreakdown[]): ListData[] {
  const normalized = normalizePercentages(breakdown);

  // Sort by descending balance, but ensure "Other" appears last
  const sorted = [...normalized].sort((a, b) => {
    // If one is "Other", it goes last
    if (a.category === 'Other' && b.category !== 'Other') return 1;
    if (b.category === 'Other' && a.category !== 'Other') return -1;
    // Otherwise sort by balance descending
    return b.balance - a.balance;
  });

  return sorted.map((item) => ({
    category: item.category,
    value: item.balance,
    percentage: item.percentage,
    icon: getLiabilityTypeIcon(item.category),
    color: getLiabilityTypeColor(item.category),
  }));
}

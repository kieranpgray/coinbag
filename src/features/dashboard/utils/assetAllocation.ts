import type { LucideIcon } from 'lucide-react';
import {
  Home,
  TrendingUp,
  Car,
  Coins,
  Wallet,
  Building2,
  Award,
} from 'lucide-react';
import type { AssetBreakdown } from '@/types/domain';

/**
 * Color mapping for asset types — CSS variables from index.css (--chart-1…6, legacy + DS v2).
 */
const ASSET_TYPE_COLORS: Record<AssetBreakdown['category'], string> = {
  Property: 'var(--chart-4)',
  'Other asset': 'var(--chart-2)',
  Vehicle: 'var(--chart-5)',
  Crypto: 'var(--chart-1)',
  Cash: 'var(--chart-3)',
  Super: 'var(--chart-6)',
  Shares: 'var(--chart-1)',
  RSUs: 'var(--chart-2)',
};

/**
 * Icon mapping for asset types
 * Uses Lucide React icons
 */
const ASSET_TYPE_ICONS: Record<AssetBreakdown['category'], LucideIcon> = {
  Property: Home,
  'Other asset': TrendingUp,
  Vehicle: Car,
  Crypto: Coins,
  Cash: Wallet,
  Super: Building2,
  Shares: TrendingUp,
  RSUs: Award,
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
 * List data format for AssetAllocationList component
 */
export interface ListData {
  category: string;
  value: number;
  percentage: number;
  icon: LucideIcon;
  color: string;
}

/**
 * Get color for an asset type
 * Falls back to 'Other asset' color if type is not found
 */
export function getAssetTypeColor(type: AssetBreakdown['category']): string {
  return ASSET_TYPE_COLORS[type] ?? ASSET_TYPE_COLORS['Other asset'];
}

/**
 * Get icon component for an asset type
 * Falls back to 'Other asset' icon if type is not found
 */
export function getAssetTypeIcon(type: AssetBreakdown['category']): LucideIcon {
  return ASSET_TYPE_ICONS[type] ?? ASSET_TYPE_ICONS['Other asset'];
}

/**
 * Normalize percentages to ensure they sum to exactly 100%
 * Handles rounding errors by adjusting the largest category
 */
export function normalizePercentages(breakdown: AssetBreakdown[]): AssetBreakdown[] {
  if (breakdown.length === 0) return breakdown;

  // Calculate current sum
  const currentSum = breakdown.reduce((sum, item) => sum + item.percentage, 0);
  const difference = 100 - currentSum;

  // If already 100%, return as-is
  if (difference === 0) return breakdown;

  // Find the largest category by value (not percentage, to preserve accuracy)
  const largestIndex = breakdown.reduce(
    (maxIndex, item, index) =>
      item.value > breakdown[maxIndex]!.value ? index : maxIndex,
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
 */
export function transformBreakdownForChart(breakdown: AssetBreakdown[]): ChartData[] {
  const normalized = normalizePercentages(breakdown);

  return normalized.map((item) => ({
    name: item.category,
    value: item.value,
    color: getAssetTypeColor(item.category),
    percentage: item.percentage,
  }));
}

/**
 * Transform breakdown data for list display
 * Adds icons, formats for list, handles < 1% display, and sorts
 */
export function transformBreakdownForList(breakdown: AssetBreakdown[]): ListData[] {
  const normalized = normalizePercentages(breakdown);

  // Sort by descending value
  const sorted = [...normalized].sort((a, b) => b.value - a.value);

  return sorted.map((item) => ({
    category: item.category,
    value: item.value,
    percentage: item.percentage,
    icon: getAssetTypeIcon(item.category),
    color: getAssetTypeColor(item.category),
  }));
}

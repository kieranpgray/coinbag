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
 * Color mapping for asset types
 * Uses explicit hex values that work in both light and dark modes
 */
const ASSET_TYPE_COLORS: Record<AssetBreakdown['category'], string> = {
  'Real Estate': '#3B5BFA',
  'Other Investments': '#00A86B',
  'Vehicles': '#8B65FF',
  'Crypto': '#FFA500',
  'Cash': '#5FA5FF',
  'Superannuation': '#6366F1',
  'Stock': '#0EA5E9',
  'RSU': '#A855F7',
};

/**
 * Icon mapping for asset types
 * Uses Lucide React icons
 */
const ASSET_TYPE_ICONS: Record<AssetBreakdown['category'], LucideIcon> = {
  'Real Estate': Home,
  'Other Investments': TrendingUp,
  'Vehicles': Car,
  'Crypto': Coins,
  'Cash': Wallet,
  'Superannuation': Building2,
  'Stock': TrendingUp,
  'RSU': Award,
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
 * Falls back to 'Other Investments' color if type is not found
 */
export function getAssetTypeColor(type: AssetBreakdown['category']): string {
  return ASSET_TYPE_COLORS[type] ?? ASSET_TYPE_COLORS['Other Investments'];
}

/**
 * Get icon component for an asset type
 * Falls back to 'Other Investments' icon if type is not found
 */
export function getAssetTypeIcon(type: AssetBreakdown['category']): LucideIcon {
  return ASSET_TYPE_ICONS[type] ?? ASSET_TYPE_ICONS['Other Investments'];
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

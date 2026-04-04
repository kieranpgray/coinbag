/**
 * Responsive donut sizing for asset/liability allocation charts.
 * outerRadius = clamp(floor(min(w,h)/2) - layoutPad - stroke, minR, maxR).
 */

export const DONUT_STROKE_WIDTH = 1;
/** Padding inside the chart box before the SVG ring (matches wrapper p-2 ≈ 8px). */
export const DONUT_LAYOUT_PAD = 8;

export type DonutRadiusTier = 'sm' | 'md' | 'lg';

const MIN_OUTER = 48;
const MAX_OUTER = 100;

export function getDonutRadii(width: number, height: number): {
  outerRadius: number;
  innerRadius: number;
  tier: DonutRadiusTier;
} {
  const w = width > 0 ? width : 200;
  const h = height > 0 ? height : 200;
  const minDim = Math.min(w, h);
  const raw = Math.floor(minDim / 2) - DONUT_LAYOUT_PAD - DONUT_STROKE_WIDTH;
  const outerRadius = Math.min(MAX_OUTER, Math.max(MIN_OUTER, raw));
  const innerRadius = outerRadius * 0.67;
  const tier: DonutRadiusTier =
    outerRadius < 58 ? 'sm' : outerRadius < 82 ? 'md' : 'lg';
  return { outerRadius, innerRadius, tier };
}

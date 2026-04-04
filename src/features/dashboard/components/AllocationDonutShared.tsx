import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ViewBox } from 'recharts/types/util/types';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { cn, formatCurrency } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getDonutRadii,
  type DonutRadiusTier,
} from '../utils/allocationDonutGeometry';

/** Resolve center for SVG label from Recharts polar or cartesian viewBox. */
function getCenterFromViewBox(viewBox?: ViewBox): { cx: number; cy: number } {
  if (!viewBox) {
    return { cx: 0, cy: 0 };
  }
  if ('cx' in viewBox && typeof viewBox.cx === 'number' && typeof viewBox.cy === 'number') {
    return { cx: viewBox.cx, cy: viewBox.cy };
  }
  if (
    'x' in viewBox &&
    'y' in viewBox &&
    typeof viewBox.x === 'number' &&
    typeof viewBox.y === 'number' &&
    typeof viewBox.width === 'number' &&
    typeof viewBox.height === 'number'
  ) {
    return {
      cx: viewBox.x + viewBox.width / 2,
      cy: viewBox.y + viewBox.height / 2,
    };
  }
  return { cx: 0, cy: 0 };
}

/** Shared chart row shape for asset and liability allocation pies. */
export interface AllocationPieDatum {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface AllocationDonutTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: AllocationPieDatum }>;
}

/**
 * Recharts tooltip for allocation donuts — typed payload, no `any`.
 */
export const AllocationDonutTooltip = memo(function AllocationDonutTooltip({
  active,
  payload,
}: AllocationDonutTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const first = payload[0];
  if (!first?.payload) {
    return null;
  }
  const data = first.payload;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-body font-semibold text-foreground mb-1">{data.name}</p>
      <p className="text-body text-muted-foreground">
        <PrivacyWrapper value={data.value} />
      </p>
      <p className="text-body text-muted-foreground">{data.percentage}%</p>
    </div>
  );
});

const totalClass: Record<DonutRadiusTier, string> = {
  sm: 'text-xs font-bold leading-tight',
  md: 'text-sm font-bold leading-tight',
  lg: 'text-base font-bold leading-tight',
};

function formatTotalForTier(
  total: number,
  locale: string,
  tier: DonutRadiusTier,
  privacyMode: boolean
): string {
  if (privacyMode) {
    return '••••';
  }
  /** Smallest tier: shorter total to reduce collision with inner ring. */
  if (tier === 'sm') {
    return formatCurrency(total, locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }
  return formatCurrency(total, locale);
}

export interface AllocationDonutCenterLabelProps {
  viewBox?: ViewBox;
  total: number;
  variant: 'assets' | 'liabilities';
  tier: DonutRadiusTier;
}

/**
 * Center label for allocation donuts — tiered typography; no text-balance on SVG tspans (Safari).
 */
export const AllocationDonutCenterLabel = memo(function AllocationDonutCenterLabel({
  viewBox,
  total,
  variant: _variant,
  tier,
}: AllocationDonutCenterLabelProps) {
  const { locale } = useLocale();
  const { privacyMode } = useTheme();
  const { cx, cy } = getCenterFromViewBox(viewBox);
  const displayValue = formatTotalForTier(total, locale, tier, privacyMode);

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-foreground"
    >
      <tspan x={cx} dy="0.35em" className={cn('font-bold', totalClass[tier])}>
        {displayValue}
      </tspan>
    </text>
  );
});

/**
 * Observe chart container and derive radii/tier for ResponsiveContainer + Pie.
 */
export function useAllocationDonutSizing() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return {
    ref,
    ...useMemo(
      () => getDonutRadii(size.width, size.height),
      [size.width, size.height]
    ),
  };
}

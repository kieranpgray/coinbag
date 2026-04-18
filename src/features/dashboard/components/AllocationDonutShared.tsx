import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { cn, formatCurrency } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getDonutRadii,
  type DonutRadiusTier,
} from '../utils/allocationDonutGeometry';

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
 * Recharts Tooltip props — must stack above `.donut-center-label` (z-index 1) and avoid the hole.
 */
export const allocationDonutTooltipProps = {
  allowEscapeViewBox: { x: true, y: true } as const,
  /** Nudge away from the cursor / centre so the box does not sit in the donut hole */
  offset: 28,
  wrapperStyle: { zIndex: 20, pointerEvents: 'none' as const },
};

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
    <div className="rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md">
      <p className="text-body font-medium text-foreground mb-1">{data.name}</p>
      <p className="text-body text-muted-foreground">
        <PrivacyWrapper value={data.value} />
      </p>
      <p className="text-body text-muted-foreground">{data.percentage}%</p>
    </div>
  );
});

const valueTierClass: Record<DonutRadiusTier, string> = {
  sm: '',
  md: 'donut-center-value--md',
  lg: 'donut-center-value--lg',
};

export function formatTotalForTier(
  total: number,
  locale: string,
  tier: DonutRadiusTier,
  privacyMode: boolean
): string {
  if (privacyMode) {
    return '••••';
  }
  if (tier === 'sm') {
    return formatCurrency(total, locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }
  return formatCurrency(total, locale);
}

export interface AllocationDonutHtmlCenterProps {
  total: number;
  tier: DonutRadiusTier;
  subLabel: string;
}

/**
 * HTML centre label — design-system-v2.html donut (Instrument Serif + sub-label).
 */
export const AllocationDonutHtmlCenter = memo(function AllocationDonutHtmlCenter({
  total,
  tier,
  subLabel,
}: AllocationDonutHtmlCenterProps) {
  const { locale } = useLocale();
  const { privacyMode } = useTheme();
  const displayValue = formatTotalForTier(total, locale, tier, privacyMode);

  return (
    <div className="donut-center-label" aria-hidden="true">
      <span className={cn('donut-center-value', valueTierClass[tier])}>{displayValue}</span>
      <span className="donut-center-sub">{subLabel}</span>
    </div>
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

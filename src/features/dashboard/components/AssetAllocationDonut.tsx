import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartData } from '../utils/assetAllocation';
import {
  AllocationDonutHtmlCenter,
  AllocationDonutTooltip,
  allocationDonutTooltipProps,
  useAllocationDonutSizing,
} from './AllocationDonutShared';

interface AssetAllocationDonutProps {
  data: ChartData[];
  totalValue: number;
}

export const AssetAllocationDonut = memo(function AssetAllocationDonut({
  data,
  totalValue,
}: AssetAllocationDonutProps) {
  const { t } = useTranslation('pages');
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { ref, outerRadius, innerRadius, tier } = useAllocationDonutSizing();

  if (!data || data.length === 0 || totalValue === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="donut-outer aspect-square w-full min-h-[180px] min-w-[180px] max-w-[220px] mx-auto shrink-0"
      role="img"
      aria-label={t('allocationBreakdown.chartAriaAssets')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            dataKey="value"
            stroke="var(--paper-3)"
            strokeWidth={1}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={prefersReducedMotion ? 0 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<AllocationDonutTooltip />} {...allocationDonutTooltipProps} />
        </PieChart>
      </ResponsiveContainer>
      <AllocationDonutHtmlCenter
        total={totalValue}
        tier={tier}
        subLabel={t('allocationBreakdown.totalAssets')}
      />
    </div>
  );
});

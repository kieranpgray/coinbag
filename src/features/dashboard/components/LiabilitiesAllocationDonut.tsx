import { memo, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
} from 'recharts';
import type { Props as RechartsLabelProps } from 'recharts/types/component/Label';
import type { ChartData } from '../utils/liabilityAllocation';
import {
  AllocationDonutCenterLabel,
  AllocationDonutTooltip,
  useAllocationDonutSizing,
} from './AllocationDonutShared';

interface LiabilitiesAllocationDonutProps {
  data: ChartData[];
  totalBalance: number;
}

export const LiabilitiesAllocationDonut = memo(function LiabilitiesAllocationDonut({
  data,
  totalBalance,
}: LiabilitiesAllocationDonutProps) {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { ref, outerRadius, innerRadius, tier } = useAllocationDonutSizing();

  if (!data || data.length === 0 || totalBalance === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="w-full box-border min-h-[200px] h-[220px] sm:h-[240px] md:h-[260px] p-2 sm:p-3"
      role="img"
      aria-label="Liability allocation chart showing portfolio breakdown"
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
            stroke="hsl(var(--border))"
            strokeWidth={1}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={prefersReducedMotion ? 0 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <Label
              content={(props: RechartsLabelProps) => (
                <AllocationDonutCenterLabel
                  viewBox={props.viewBox}
                  total={totalBalance}
                  variant="liabilities"
                  tier={tier}
                />
              )}
              position="center"
            />
          </Pie>
          <Tooltip content={<AllocationDonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

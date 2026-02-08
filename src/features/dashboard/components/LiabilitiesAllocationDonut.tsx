import { memo, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
} from 'recharts';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { formatCurrency } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ChartData } from '../utils/liabilityAllocation';

interface LiabilitiesAllocationDonutProps {
  data: ChartData[];
  totalBalance: number;
}

/**
 * Custom tooltip for the donut chart
 * Shows category name, formatted balance, and percentage
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as ChartData;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-semibold text-foreground mb-1">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        <PrivacyWrapper value={data.value} />
      </p>
      <p className="text-sm text-muted-foreground">{data.percentage}%</p>
    </div>
  );
}

/**
 * Center label component for the donut chart
 * Shows "All liabilities" on line 1 and formatted total balance on line 2
 * Recharts Label component passes viewBox as prop
 * Note: Privacy mode is handled by showing "••••" instead of formatted currency
 */
function CenterLabel({ viewBox, totalBalance }: { viewBox?: { cx: number; cy: number }; totalBalance: number }) {
  const { locale } = useLocale();
  const { privacyMode } = useTheme();
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;

  // Format value for display (privacy mode handled here since we're in SVG)
  const displayValue = privacyMode ? '••••' : formatCurrency(totalBalance, locale);

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-foreground"
    >
      <tspan x={cx} dy="-0.5em" className="text-sm font-medium">
        All liabilities
      </tspan>
      <tspan x={cx} dy="1.2em" className="text-lg font-bold">
        {displayValue}
      </tspan>
    </text>
  );
}

/**
 * Liability allocation donut chart component using Recharts
 * Displays portfolio breakdown with center label and tooltip
 * Uses red theme colors to distinguish from asset allocation
 */
export const LiabilitiesAllocationDonut = memo(function LiabilitiesAllocationDonut({
  data,
  totalBalance,
}: LiabilitiesAllocationDonutProps) {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Return null if no data (parent handles empty state)
  if (!data || data.length === 0 || totalBalance === 0) {
    return null;
  }

  // Outer radius calculation - responsive sizing
  const outerRadius = 80;
  const innerRadius = outerRadius * 0.67; // Exactly 67% of outer radius

  return (
    <div
      className="w-full h-full min-h-[200px] -m-2"
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
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}
            <Label
              content={(props: any) => <CenterLabel {...props} totalBalance={totalBalance} />}
              position="center"
            />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

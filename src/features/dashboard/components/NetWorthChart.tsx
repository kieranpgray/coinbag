import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import type { NetWorthPoint, NetWorthTimePeriod } from '../hooks/useNetWorthHistory';
import {
  buildNetWorthYAxis,
  formatNetWorthYAxisTick,
} from '../utils/netWorthAxis';

interface NetWorthChartProps {
  data: NetWorthPoint[];
  timePeriod: NetWorthTimePeriod;
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * Custom tooltip component for the net worth chart
 */
function CustomTooltip({ active, payload, label }: any) {
  const { privacyMode } = useTheme();
  const { locale } = useLocale();

  if (!active || !payload || !payload.length) {
    return null;
  }

  const value = payload[0].value as number;
  const date = label as string;

  return (
    <div className="chart-tooltip-mock">
      <p className="chart-tooltip-date">
        {formatDate(date, locale, 'medium')}
      </p>
      <p className="chart-tooltip-value">
        {privacyMode ? '••••' : formatCurrency(value, locale)}
      </p>
    </div>
  );
}

/**
 * Net worth time-series chart component using Recharts AreaChart.
 * Displays 90 days of historical net worth data with privacy mode support.
 */
export const NetWorthChart = memo(function NetWorthChart({
  data,
  timePeriod,
  isLoading,
  isEmpty,
}: NetWorthChartProps) {
  const { t } = useTranslation('pages');
  const { locale } = useLocale();
  const [chartHeight, setChartHeight] = useState(300);
  
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  
  // Calculate evenly spaced tick positions for each time period
  const xAxisTicks = useMemo(() => {
    if (!data || data.length === 0) return undefined;
    
    const dataLength = data.length;
    
    if (timePeriod === '5y') {
      // Get all unique years in filtered data, sorted
      const years = Array.from(new Set(
        data.map(point => new Date(point.date).getFullYear())
      )).sort((a, b) => a - b);
      
      if (years.length === 0) return undefined;
      
      // Find first data point for each year to ensure year boundaries are used
      // This aligns with the calendar year filtering logic and ensures each year appears exactly once
      const yearTicks = years.map(year => {
        return data.find(point => new Date(point.date).getFullYear() === year)?.date;
      }).filter((date): date is string => date !== undefined);
      
      // Use year boundaries if we found all years, otherwise fallback to evenly spaced
      if (yearTicks.length === years.length && years.length >= 4) {
        return yearTicks;
      }
      
      // Fallback to evenly spaced if year boundaries aren't found (shouldn't happen with proper data)
      const indices = Array.from({ length: years.length }, (_, i) => {
        if (years.length === 1) return 0;
        return Math.floor((i / (years.length - 1)) * (dataLength - 1));
      });
      
      return indices.map(i => data[i]?.date).filter((date): date is string => date !== undefined);
    }
    
    // For other periods, calculate evenly spaced positions
    const targetTicks = timePeriod === '1y' ? 8 : 7;
    
    // If we have fewer data points than target ticks, show all
    if (dataLength <= targetTicks) {
      return data.map(point => point.date);
    }
    
    // Calculate evenly spaced indices
    const indices = Array.from({ length: targetTicks }, (_, i) => {
      return Math.floor((i / (targetTicks - 1)) * (dataLength - 1));
    });
    
    // Map to actual date values
    return indices.map(i => data[i]?.date).filter((date): date is string => date !== undefined);
  }, [data, timePeriod]);
  
  // Memoized X-axis tick formatter based on time period
  const formatXAxisTick = useMemo(() => {
    return (value: string) => {
      const date = new Date(value);
      
      switch (timePeriod) {
        case '30d':
        case '90d':
          return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        case '1y':
          return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
        case '5y':
          return date.toLocaleDateString(locale, { year: 'numeric' });
        default:
          return date.toLocaleDateString(locale);
      }
    };
  }, [timePeriod, locale]);

  // Update chart height based on window size
  useEffect(() => {
    const updateHeight = () => {
      setChartHeight(window.innerWidth >= 768 ? 300 : 200);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Y-axis: range-driven nice steps + compact $k/$m labels (see public/design-system-v2.html)
  const targetYTickCount = chartHeight >= 300 ? 5 : 4;
  const {
    domain: yDomain,
    ticks: yTicks,
    labelPrecision: yLabelPrecision,
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        domain: [0, 1000] as [number, number],
        ticks: [0, 250, 500, 750, 1000],
        labelPrecision: { kMax: 1, mMax: 1 },
      };
    }

    const chartData = data.length === 1 ? [data[0], data[0]] : data;
    const values = chartData.map((d) => d?.value ?? 0).filter((v): v is number => v !== undefined);

    if (values.length === 0) {
      return {
        domain: [0, 1000] as [number, number],
        ticks: [0, 250, 500, 750, 1000],
        labelPrecision: { kMax: 1, mMax: 1 },
      };
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return buildNetWorthYAxis(minValue, maxValue, {
      targetTickCount: targetYTickCount,
    });
  }, [data, targetYTickCount]);

  const formatYAxisTick = useCallback(
    (value: number) =>
      formatNetWorthYAxisTick(value, {
        kMax: yLabelPrecision.kMax,
        mMax: yLabelPrecision.mMax,
      }),
    [yLabelPrecision.kMax, yLabelPrecision.mMax]
  );

  const useDangerSeries = useMemo(() => {
    if (!data || data.length === 0) return false;
    return data.some(point => point.value < 0);
  }, [data]);
  const seriesColor = useDangerSeries ? 'var(--danger)' : 'var(--chart-1)';

  // Handle loading state
  if (isLoading) {
    return <div className="chart-skeleton h-[200px] md:h-[300px] w-full" />;
  }

  // Handle empty state
  if (isEmpty || !data || data.length === 0) {
    return (
      <div className="h-[200px] md:h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-[var(--ink-4)]"
            aria-hidden="true"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-[13px] text-[var(--ink-3)]">
            {data && data.length === 0 && !isEmpty
              ? t('netWorth.noDataForPeriod')
              : t('netWorth.noHistoricalData')}
          </p>
        </div>
      </div>
    );
  }

  // Ensure minimum 2 data points (required for chart rendering)
  // If only one point, duplicate it
  const chartData = data.length === 1 ? [data[0], data[0]] : data;

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Net worth over time chart"
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor} stopOpacity={0.12} />
              <stop offset="100%" stopColor={seriesColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            type="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickFormatter={formatXAxisTick}
            stroke="transparent"
            ticks={xAxisTicks}
            interval={0}
          />
          {chartHeight >= 300 && (
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={formatYAxisTick}
              stroke="transparent"
              domain={yDomain}
              ticks={yTicks}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={seriesColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#netWorthGradient)"
            dot={false}
            activeDot={{ r: 6, fill: seriesColor, stroke: seriesColor }}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={prefersReducedMotion ? 0 : 750}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

import { memo, useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import type { NetWorthPoint, NetWorthTimePeriod } from '../hooks/useNetWorthHistory';

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
    <div className="bg-card border border-neutral-200 rounded-lg shadow-lg p-3">
      <p className="text-body-sm text-muted-foreground mb-1">
        {formatDate(date, locale, 'medium')}
      </p>
      <p className="text-body-lg font-bold text-foreground">
        {privacyMode ? '••••' : formatCurrency(value, locale)}
      </p>
    </div>
  );
}

/**
 * Format Y-axis tick values for better readability
 */
function formatYAxisTick(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Calculate "nice" domain values for Y-axis that round to clean intervals.
 * Ensures Y-axis uses round numbers (e.g., -15K, -12K, -9K instead of -14.2K, -12.7K, -9.9K).
 * 
 * @param min - Minimum value in the data
 * @param max - Maximum value in the data
 * @returns Tuple of [niceMin, niceMax] for Y-axis domain
 */
function calculateNiceDomain(min: number, max: number): [number, number] {
  const range = max - min;
  
  // Handle edge case: all values are the same
  if (range === 0) {
    const padding = Math.abs(max) * 0.1 || 1000;
    return [min - padding, max + padding];
  }
  
  const padding = range * 0.1; // 10% padding
  let paddedMin = min - padding;
  let paddedMax = max + padding;
  
  // Handle zero-crossing
  const crossesZero = min < 0 && max > 0;
  
  let niceInterval: number;
  
  // Prefer $5k increments for mid-range values ($10k-$100k)
  if (range >= 10000 && range < 100000) {
    niceInterval = 5000;
  } 
  // Use $1k increments for small ranges ($1k-$10k)
  else if (range >= 1000 && range < 10000) {
    niceInterval = 1000;
  } 
  // For very small ranges (< $1k), use $100 increments
  else if (range < 1000) {
    niceInterval = 100;
  }
  // For large ranges (>= $100k), use magnitude-based with preference for $10k/$50k
  else {
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    if (magnitude >= 100000) {
      niceInterval = 50000; // $50k increments for very large ranges
    } else {
      niceInterval = 10000; // $10k increments for large ranges
    }
  }
  
  // Round to nice intervals
  const niceMin = Math.floor(paddedMin / niceInterval) * niceInterval;
  const niceMax = Math.ceil(paddedMax / niceInterval) * niceInterval;
  
  // Ensure zero is visible if data crosses zero
  if (crossesZero) {
    return [
      Math.min(niceMin, -niceInterval),
      Math.max(niceMax, niceInterval)
    ];
  }
  
  return [niceMin, niceMax];
}

/**
 * Calculate clean Y-axis tick values based on the domain
 * Returns evenly spaced ticks at nice round intervals
 */
function calculateNiceTicks(domain: [number, number]): number[] {
  const [min, max] = domain;
  const range = max - min;
  
  if (range === 0) {
    return [min];
  }
  
  // Determine the best interval based on the range
  let niceInterval: number;
  
  if (range >= 100000 && range < 500000) {
    // For ranges like 400k-500k, use $50k increments
    niceInterval = 50000;
  } else if (range >= 500000) {
    // For very large ranges, use $100k increments
    niceInterval = 100000;
  } else if (range >= 10000 && range < 100000) {
    niceInterval = 5000; // $5k increments
  } else if (range >= 1000 && range < 10000) {
    niceInterval = 1000; // $1k increments
  } else if (range < 1000) {
    niceInterval = 100; // $100 increments
  } else {
    // Fallback: use $10k increments
    niceInterval = 10000;
  }
  
  // Generate ticks from min to max at the nice interval
  const ticks: number[] = [];
  const startTick = Math.ceil(min / niceInterval) * niceInterval;
  const endTick = Math.floor(max / niceInterval) * niceInterval;
  
  for (let tick = startTick; tick <= endTick; tick += niceInterval) {
    ticks.push(tick);
  }
  
  // Ensure we have at least min and max if no ticks were generated
  if (ticks.length === 0) {
    ticks.push(min, max);
  }
  
  return ticks;
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

  // Calculate Y-axis domain and ticks with nice round numbers (must be before early returns for Rules of Hooks)
  const { domain: yDomain, ticks: yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { domain: [0, 1000] as [number, number], ticks: [0, 1000] };
    }
    
    const chartData = data.length === 1 ? [data[0], data[0]] : data;
    const values = chartData.map((d) => d?.value ?? 0).filter((v): v is number => v !== undefined);
    
    if (values.length === 0) {
      return { domain: [0, 1000] as [number, number], ticks: [0, 1000] };
    }
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const domain = calculateNiceDomain(minValue, maxValue);
    const ticks = calculateNiceTicks(domain);
    
    return { domain, ticks };
  }, [data]);

  // Handle loading state
  if (isLoading) {
    return <Skeleton className="h-[200px] md:h-[300px] w-full" />;
  }

  // Handle empty state
  if (isEmpty || !data || data.length === 0) {
    return (
      <div className="h-[200px] md:h-[300px] flex items-center justify-center">
        <p className="text-body-sm text-muted-foreground">
          {data && data.length === 0 && !isEmpty 
            ? 'No data available for selected time period' 
            : 'No historical data available'}
        </p>
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
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={formatXAxisTick}
            stroke="hsl(var(--border))"
            ticks={xAxisTicks}
            interval={0}
          />
          {chartHeight >= 300 && (
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={formatYAxisTick}
              stroke="hsl(var(--border))"
              domain={yDomain}
              ticks={yTicks}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            isAnimationActive={!prefersReducedMotion}
            animationDuration={prefersReducedMotion ? 0 : 750}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

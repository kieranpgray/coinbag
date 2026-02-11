import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useLiabilityBalanceHistory } from '../hooks/useLiabilities';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LiabilityBalanceTimelineProps {
  liabilityId: string;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground mb-1">
          {formatDate(data.date)}
        </p>
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(data.balance)}
        </p>
      </div>
    );
  }
  return null;
}

export function LiabilityBalanceTimeline({ liabilityId }: LiabilityBalanceTimelineProps) {
  const { data: history, isLoading, error } = useLiabilityBalanceHistory(liabilityId);

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Build timeline data points from history
    const points: Array<{ date: string; balance: number }> = [];
    
    // Sort by date ascending for timeline
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedHistory.forEach((entry) => {
      points.push({
        date: entry.createdAt,
        balance: entry.newBalance,
      });
    });

    return points;
  }, [history]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (error) {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to load timeline.
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No timeline data available.
      </div>
    );
  }

  // If only one point, duplicate it for chart display
  const displayData = chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;

  return (
    <div className="w-full h-48" role="img" aria-label="Liability balance timeline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) => formatDate(value)}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
              return `$${value}`;
            }}
            stroke="hsl(var(--border))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
            isAnimationActive={true}
            animationDuration={750}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

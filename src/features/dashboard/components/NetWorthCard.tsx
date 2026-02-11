import { memo, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { subDays, startOfYear } from 'date-fns';
import { 
  useNetWorthHistory, 
  DEFAULT_NET_WORTH_TIME_PERIOD,
  NET_WORTH_TIME_PERIODS,
  type NetWorthTimePeriod,
  type NetWorthPoint,
  sampleEveryNDays
} from '../hooks/useNetWorthHistory';
import { NetWorthChart } from './NetWorthChart';
import { NetWorthSummary } from './NetWorthSummary';

interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  change1D: number;
  change1W: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * Sample data points based on the selected time period.
 * Applies appropriate sampling strategy for each time period to ensure even X-axis spacing.
 * 
 * @param data - Array of net worth data points
 * @param timePeriod - Selected time period (30d, 90d, 1y, 5y)
 * @returns Sampled array of data points
 */
function sampleByTimePeriod(
  data: NetWorthPoint[],
  timePeriod: NetWorthTimePeriod
): NetWorthPoint[] {
  if (data.length === 0) return data;
  
  switch (timePeriod) {
    case '30d':
      return data; // Daily - no sampling
    case '90d':
      return sampleEveryNDays(data, 3, false); // Every 3 days
    case '1y':
      return sampleEveryNDays(data, 7, false); // Weekly
    case '5y':
      return sampleEveryNDays(data, 30, true); // Monthly + year boundaries
    default:
      return data;
  }
}

export const NetWorthCard = memo(function NetWorthCard({ 
  netWorth, 
  totalAssets,
  totalLiabilities,
  change1D: _change1D,
  change1W: _change1W,
  isLoading,
  isEmpty,
}: NetWorthCardProps) {
  // Time period state (default: 90 days)
  const [timePeriod, setTimePeriod] = useState<NetWorthTimePeriod>(DEFAULT_NET_WORTH_TIME_PERIOD);
  
  // Generate historical data for chart
  const { data: historyData, isLoading: historyLoading } = useNetWorthHistory(netWorth, isLoading);
  
  // Filter data based on selected time period
  const filteredHistoryData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];
    
    const today = new Date();
    let cutoffDate: Date;
    
    // For 5y period, use calendar year boundaries (last 5 calendar years)
    // This ensures we show only the last 5 calendar years (e.g., 2022-2026 in 2026)
    if (timePeriod === '5y') {
      const currentYear = today.getFullYear();
      const fiveYearsAgoYear = currentYear - 4; // 5 calendar years: currentYear, currentYear-1, currentYear-2, currentYear-3, currentYear-4
      cutoffDate = startOfYear(new Date(fiveYearsAgoYear, 0, 1));
    } else {
      // For other periods, use exact day count
      cutoffDate = subDays(today, NET_WORTH_TIME_PERIODS[timePeriod].days);
    }
    
    const filtered = historyData.filter(point => {
      const pointDate = new Date(point.date);
      return pointDate >= cutoffDate;
    });
    
    // Development-only validation: Check if 5y filtered data contains expected years
    if (import.meta.env.DEV && timePeriod === '5y' && filtered.length > 0) {
      const currentYear = today.getFullYear();
      const expectedYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
      const actualYears = new Set(
        filtered.map(point => new Date(point.date).getFullYear())
      );
      
      const missingYears = expectedYears.filter(year => !actualYears.has(year));
      if (missingYears.length > 0) {
        console.warn(
          `[NetWorthCard] 5y filtered data missing expected years: ${missingYears.join(', ')}. ` +
          `Expected years: ${expectedYears.join(', ')}, ` +
          `Actual years: ${Array.from(actualYears).sort().join(', ')}`
        );
      }
    }
    
    // Apply time-period-aware sampling to ensure even X-axis spacing
    return sampleByTimePeriod(filtered, timePeriod);
  }, [historyData, timePeriod]);

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <Skeleton className="h-[300px] w-full" />
              </div>
              <div className="md:col-span-1">
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="p-4">
            <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground mb-4">Net Worth</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add assets or liabilities to calculate your net worth.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/wealth?create=asset">Add asset</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/wealth?create=liability">Add liability</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold text-foreground">
              Net Worth
            </h2>
            <Tabs 
              value={timePeriod} 
              onValueChange={(value) => setTimePeriod(value as NetWorthTimePeriod)}
              aria-label="Select time period for net worth chart"
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="30d">30d</TabsTrigger>
                <TabsTrigger value="90d">90d</TabsTrigger>
                <TabsTrigger value="1y">1y</TabsTrigger>
                <TabsTrigger value="5y">5y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content - Hero layout with chart and summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 pb-4">
          {/* Chart - 75% on desktop, full width on mobile */}
          <div className="md:col-span-3 order-2 md:order-1">
            <NetWorthChart 
              data={filteredHistoryData} 
              timePeriod={timePeriod}
              isLoading={isLoading || historyLoading} 
              isEmpty={isEmpty} 
            />
          </div>
          
          {/* Summary - 25% on desktop, full width on mobile, appears first on mobile */}
          <div className="md:col-span-1 order-1 md:order-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4">
            <NetWorthSummary 
              netWorth={netWorth}
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              isLoading={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

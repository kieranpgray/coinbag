import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { parseISO, subDays, startOfYear } from 'date-fns';
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
import { getCorrelationId, logger } from '@/lib/logger';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/utils';
import { ROUTES } from '@/lib/constants/routes';

function findHistoryPointClosestToDaysAgo(
  points: NetWorthPoint[],
  daysAgo: number
): NetWorthPoint | null {
  if (points.length < 2) return null;
  const targetMs = subDays(new Date(), daysAgo).getTime();
  let best = points[0]!;
  let bestDiff = Infinity;
  for (const p of points) {
    const d = Math.abs(parseISO(p.date).getTime() - targetMs);
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  return best;
}
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
  const { t } = useTranslation('pages');
  const { locale } = useLocale();
  const { privacyMode } = useTheme();

  // Time period state (default: 90 days)
  const [timePeriod, setTimePeriod] = useState<NetWorthTimePeriod>(DEFAULT_NET_WORTH_TIME_PERIOD);
  
  // Generate historical data for chart
  const { data: historyData, isLoading: historyLoading } = useNetWorthHistory(netWorth, isLoading);

  const netWorthMonthNote = useMemo(() => {
    if (historyLoading) {
      return t('netWorth.holdingSteady');
    }
    if (!historyData || historyData.length < 2) {
      return t('netWorth.holdingSteady');
    }
    const closest = findHistoryPointClosestToDaysAgo(historyData, 30);
    if (!closest) {
      return t('netWorth.holdingSteady');
    }
    const delta = netWorth - closest.value;
    if (Math.round(delta * 100) === 0) {
      return t('netWorth.holdingSteady');
    }
    const priv = t('netWorth.privacyAmount');
    if (privacyMode) {
      return delta > 0 ? `+${priv} this month` : `−${priv} this month`;
    }
    if (delta > 0) {
      return t('netWorth.upThisMonth', { amount: formatCurrency(delta, locale) });
    }
    return t('netWorth.downThisMonth', { amount: formatCurrency(Math.abs(delta), locale) });
  }, [historyData, historyLoading, netWorth, locale, privacyMode, t]);
  
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
        logger.debug(
          'NET_WORTH_CARD:5Y',
          '5y filtered data missing expected calendar years',
          {
            missingYears,
            expectedYears,
            actualYears: Array.from(actualYears).sort(),
          },
          getCorrelationId() || undefined
        );
      }
    }
    
    // Apply time-period-aware sampling to ensure even X-axis spacing
    return sampleByTimePeriod(filtered, timePeriod);
  }, [historyData, timePeriod]);

  const timePeriodSubtitle = useMemo(() => {
    if (timePeriod === '30d') return t('netWorth.timeRange30d');
    if (timePeriod === '90d') return t('netWorth.timeRange90d');
    if (timePeriod === '5y') return t('netWorth.timeRange5y');
    return t('netWorth.timeRange1y');
  }, [timePeriod, t]);

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <div className="chart-skeleton h-[200px] md:h-[300px] w-full" />
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
            <h2 className="display-sm mb-2">{t('netWorth.title')}</h2>
            <p className="text-body font-medium text-foreground mb-2">
              {t('emptyStates.netWorthNoHoldings.headline')}
            </p>
            <p className="text-body text-muted-foreground mb-4">
              {t('emptyStates.netWorthNoHoldings.body')}
            </p>
            <Button asChild size="sm" aria-label={t('emptyStates.netWorthNoHoldings.ctaAriaLabel')}>
              <Link to={ROUTES.wealth.createAsset()}>{t('emptyStates.netWorthNoHoldings.cta')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div className="md:col-span-3 order-2 md:order-1">
            <div className="chart-container chart-container--in-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between chart-header">
                <div>
                  <div className="chart-title">{t('netWorth.title')}</div>
                  <div className="chart-subtitle">{timePeriodSubtitle}</div>
                </div>
                <div
                  className="chart-time-tabs"
                  role="tablist"
                  aria-label={t('netWorth.timeRangeAria')}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timePeriod === '30d'}
                    className={`chart-time-tab ${timePeriod === '30d' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('30d')}
                  >
                    30d
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timePeriod === '90d'}
                    className={`chart-time-tab ${timePeriod === '90d' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('90d')}
                  >
                    90d
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timePeriod === '1y'}
                    className={`chart-time-tab ${timePeriod === '1y' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('1y')}
                  >
                    1y
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timePeriod === '5y'}
                    className={`chart-time-tab ${timePeriod === '5y' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('5y')}
                  >
                    5y
                  </button>
                </div>
              </div>
              <NetWorthChart
                data={filteredHistoryData}
                timePeriod={timePeriod}
                isLoading={isLoading || historyLoading}
                isEmpty={isEmpty}
              />
            </div>
          </div>

          <div className="md:col-span-1 order-1 md:order-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4">
            <NetWorthSummary
              netWorth={netWorth}
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              isLoading={isLoading}
              netWorthFootnote={netWorthMonthNote}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { format, startOfYear, subDays } from 'date-fns';
import { createNetWorthHistoryRepository } from '@/data/netWorthHistory/repo';
import { logger, getCorrelationId } from '@/lib/logger';
import { fetchSP500Data, getSP500DailyReturns, getSP500ReturnForDate } from '@/lib/sp500Data';

/**
 * Represents a single data point in the net worth history chart
 */
export interface NetWorthPoint {
  date: string; // ISO date string (YYYY-MM-DD format)
  value: number; // net worth value (can be negative)
}

/**
 * Time period options for net worth chart display
 */
export type NetWorthTimePeriod = '30d' | '90d' | '1y' | '5y';

/**
 * Configuration for net worth time periods
 */
export const NET_WORTH_TIME_PERIODS = {
  '30d': { days: 30, label: '30d' },
  '90d': { days: 90, label: '90d' },
  '1y': { days: 365, label: '1y' },
  '5y': { days: 1825, label: '5y' },
} as const;

/**
 * Default time period for net worth chart (90 days)
 */
export const DEFAULT_NET_WORTH_TIME_PERIOD: NetWorthTimePeriod = '90d';

// Constants for data generation
const ANNUAL_APPRECIATION_RATE = 0.10; // 10% annual growth

/**
 * Generates historical net worth data points for chart visualization.
 * 
 * Fetches real historical data from the database and merges it with synthetic data.
 * Real data progressively replaces synthetic data chronologically as it becomes available.
 * 
 * Generates 5 years of synthetic data with 10% annual appreciation.
 * Uses compound growth model: value = currentNetWorth / (1 + dailyRate)^daysAgo
 * 
 * @param currentNetWorth - Current net worth value
 * @param isLoading - Whether data is currently loading
 * @returns Object with data array, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { data, isLoading: historyLoading, error } = useNetWorthHistory(netWorth, isLoading);
 * ```
 */
export function useNetWorthHistory(
  currentNetWorth: number | undefined,
  isLoading?: boolean
): {
  data: NetWorthPoint[];
  isLoading: boolean;
  error: Error | null;
} {
  const { getToken } = useAuth();
  
  // Calculate date range for query (last 5 calendar years)
  // Use calendar year boundaries to align with filtering logic in NetWorthCard
  const today = new Date();
  const currentYear = today.getFullYear();
  const fiveYearsAgoYear = currentYear - 4; // 5 calendar years: currentYear, currentYear-1, currentYear-2, currentYear-3, currentYear-4
  const fiveYearsAgo = startOfYear(new Date(fiveYearsAgoYear, 0, 1));
  const startDate = format(fiveYearsAgo, 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');
  
  // Fetch real historical data from repository
  const {
    data: realData = [],
    isLoading: realDataLoading,
    error: realDataError,
  } = useQuery<NetWorthPoint[]>({
    queryKey: ['netWorthHistory', startDate, endDate],
    queryFn: async () => {
      if (!getToken) {
        throw new Error('Authentication token provider not available');
      }
      
      const correlationId = getCorrelationId();
      try {
        logger.debug(
          'NET_WORTH_HISTORY:FETCH',
          'Fetching real historical data',
          { startDate, endDate },
          correlationId || undefined
        );
        
        const repo = createNetWorthHistoryRepository();
        const result = await repo.list(getToken, startDate, endDate);
        
        if (result.error) {
          logger.error(
            'NET_WORTH_HISTORY:FETCH',
            'Failed to fetch historical data',
            { error: result.error },
            correlationId || undefined
          );
          throw new Error(result.error.error);
        }
        
        logger.info(
          'NET_WORTH_HISTORY:FETCH',
          'Historical data fetched successfully',
          { count: result.data?.length || 0 },
          correlationId || undefined
        );
        
        return result.data || [];
      } catch (error) {
        logger.error(
          'NET_WORTH_HISTORY:FETCH',
          'Error fetching historical data',
          { error: error instanceof Error ? error.message : String(error) },
          correlationId || undefined
        );
        throw error;
      }
    },
    enabled: !isLoading && currentNetWorth !== undefined && currentNetWorth !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Retry once on failure
  });
  
  // Find earliest real data point date (if any real data exists)
  const earliestRealDataDate = useMemo(() => {
    if (!realData || realData.length === 0) {
      return null;
    }
    return realData.reduce((earliest, point) => 
      point.date < earliest ? point.date : earliest, 
      realData[0]!.date
    );
  }, [realData]);

  // Determine the cutoff date for S&P 500 projections
  // Only generate S&P 500 data for dates BEFORE the first real data point
  const sp500EndDate = useMemo(() => {
    if (earliestRealDataDate) {
      // Day before first real data point
      return subDays(new Date(earliestRealDataDate), 1);
    }
    // Use today if no real data exists
    return new Date();
  }, [earliestRealDataDate]);

  // Fetch S&P 500 data only for the pre-tracking period
  const {
    data: sp500Prices = null,
    isLoading: sp500Loading,
  } = useQuery({
    queryKey: ['sp500Data', startDate, format(sp500EndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const endDateStr = format(sp500EndDate, 'yyyy-MM-dd');
      return await fetchSP500Data(startDate, endDateStr);
    },
    enabled: !isLoading && currentNetWorth !== undefined && currentNetWorth !== null,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (S&P 500 data updates daily)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
  });

  // Calculate S&P 500 daily returns
  const sp500Returns = useMemo(() => {
    if (!sp500Prices || sp500Prices.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[useNetWorthHistory] No S&P 500 prices available, will use fallback rate');
      }
      return [];
    }
    const returns = getSP500DailyReturns(sp500Prices);
    if (import.meta.env.DEV) {
      console.log(`[useNetWorthHistory] Calculated ${returns.length} S&P 500 daily returns from ${sp500Prices.length} price points`);
      if (returns.length > 0) {
        console.log('[useNetWorthHistory] Sample returns:', {
          first: returns[0],
          last: returns[returns.length - 1],
          dateRange: {
            start: sp500Prices[0]?.date,
            end: sp500Prices[sp500Prices.length - 1]?.date,
          },
        });
      }
    }
    return returns;
  }, [sp500Prices]);

  // Generate mocked data using S&P 500 returns (only for dates before first real data point)
  const mockedData = useMemo(() => {
    // Return empty array if loading or net worth is undefined/null
    if (isLoading || currentNetWorth === undefined || currentNetWorth === null) {
      return [];
    }

    const today = new Date();
    const points: NetWorthPoint[] = [];

    // Use calendar year boundaries to align with filtering logic in NetWorthCard
    // Start from January 1st of 5 calendar years ago (e.g., Jan 1, 2022 if today is in 2026)
    const currentYear = today.getFullYear();
    const fiveYearsAgoYear = currentYear - 4; // 5 calendar years: currentYear, currentYear-1, currentYear-2, currentYear-3, currentYear-4
    const startDateObj = startOfYear(new Date(fiveYearsAgoYear, 0, 1));
    const daysFromStart = Math.floor((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

    // Handle zero net worth: generate flat line at zero
    if (currentNetWorth === 0) {
      for (let i = 0; i <= daysFromStart; i++) {
        const date = new Date(startDateObj);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Skip if this date is on or after the first real data point
        if (earliestRealDataDate && dateStr >= earliestRealDataDate) {
          continue;
        }
        
        points.push({
          date: dateStr,
          value: 0,
        });
      }
      return points;
    }

    // Calculate starting value for backward projection
    // If real data exists, start from the first real data point's value
    // Otherwise, start from current net worth
    const startingValue = earliestRealDataDate && realData && realData.length > 0
      ? realData.find(p => p.date === earliestRealDataDate)?.value ?? currentNetWorth
      : currentNetWorth;

    // Generate data points from start date (Jan 1 of 5 years ago) to cutoff date
    // Only generate mocked data for dates BEFORE the first real data point
    const cutoffDate = earliestRealDataDate ? new Date(earliestRealDataDate) : null;
    const endDateForGeneration = cutoffDate || today;
    const endDateStr = format(endDateForGeneration, 'yyyy-MM-dd');
    
    // First, collect all dates that need data points (before cutoff date)
    const datesToGenerate: string[] = [];
    for (let i = 0; i <= daysFromStart; i++) {
      const date = new Date(startDateObj);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Skip if this date is on or after the first real data point
      if (cutoffDate && date >= cutoffDate) {
        continue;
      }
      
      // Skip if date is after end date for generation
      if (dateStr > endDateStr) {
        continue;
      }
      
      datesToGenerate.push(dateStr);
    }
    
    if (datesToGenerate.length === 0) {
      // No dates to generate (all covered by real data)
      return [];
    }
    
    // Determine if we should use S&P 500 data or fallback to 10% rate
    const useSP500Data = sp500Returns.length > 0;
    const fallbackDailyRate = Math.pow(1 + ANNUAL_APPRECIATION_RATE, 1 / 365) - 1;
    
    if (import.meta.env.DEV) {
      console.log('[useNetWorthHistory] Mocked data generation:', {
        useSP500Data,
        sp500ReturnsCount: sp500Returns.length,
        earliestRealDataDate,
        startingValue,
        datesToGenerate: datesToGenerate.length,
      });
    }
    
    // Work backwards from the last date (closest to cutoff) to calculate historical values
    // Start with the starting value and work backwards
    let currentValue = startingValue;
    const valueMap = new Map<string, number>();
    
    // Process dates in reverse order (newest to oldest) to apply returns backwards
    for (let i = datesToGenerate.length - 1; i >= 0; i--) {
      const dateStr = datesToGenerate[i]!;
      
      // Get daily return (S&P 500 or fallback)
      let dailyReturn: number;
      if (useSP500Data) {
        const sp500Return = getSP500ReturnForDate(dateStr, sp500Returns);
        // getSP500ReturnForDate returns null if no data found, or a number (which could be 0 for 0% return)
        if (sp500Return === null) {
          // No S&P 500 data available for this date, use fallback
          dailyReturn = fallbackDailyRate;
        } else {
          // Use the S&P 500 return (could be 0, positive, or negative)
          dailyReturn = sp500Return;
        }
      } else {
        dailyReturn = fallbackDailyRate;
      }
      
      // Store current value for this date
      valueMap.set(dateStr, currentValue);
      
      // Move backwards: apply return backwards by dividing by (1 + return)
      if (i > 0) {
        // Apply return backwards: historical = current / (1 + return)
        currentValue = currentValue / (1 + dailyReturn);
      }
    }
    
    // Generate points in chronological order (oldest to newest)
    for (const dateStr of datesToGenerate) {
      let value = valueMap.get(dateStr) ?? startingValue;
      
      // Ensure values remain positive if starting value is positive
      // Allow negative values if starting value is negative
      if (startingValue > 0 && value < 0) {
        value = Math.abs(value) * 0.1; // Small positive value
      }
      
      // Ensure values don't exceed reasonable bounds
      if (startingValue > 0 && value > startingValue * 2) {
        value = startingValue * 1.9;
      } else if (startingValue < 0 && value < startingValue * 2) {
        value = startingValue * 1.9;
      }
      
      points.push({
        date: dateStr,
        value: Math.round(value * 100) / 100, // Round to 2 decimal places
      });
    }

    // Sort by date to ensure chronological order (oldest to newest)
    points.sort((a, b) => a.date.localeCompare(b.date));

    // Ensure minimum 2 data points (required for chart rendering)
    if (points.length < 2) {
      const date = format(today, 'yyyy-MM-dd');
      return [
        { date, value: startingValue },
        { date, value: startingValue },
      ];
    }

    // Return full daily data - sampling will be applied in NetWorthCard based on time period
    return points;
  }, [currentNetWorth, isLoading, earliestRealDataDate, realData, sp500Returns]);
  
  // Merge real and mocked data with progressive replacement
  // Real data always takes precedence - S&P 500 projections only fill gaps before first real data point
  const mergedData = useMemo(() => {
    if (realDataLoading || isLoading || sp500Loading) {
      // Return empty array while loading (chart will show loading state)
      return [];
    }
    
    // If there's an error fetching real data, fallback to mocked data only
    if (realDataError) {
      logger.warn(
        'NET_WORTH_HISTORY:MERGE',
        'Error fetching real data, using mocked data only',
        { error: realDataError.message }
      );
      return mockedData;
    }
    
    // Merge real and mocked data - real data always takes precedence
    return mergeRealAndMockedData(realData, mockedData);
  }, [realData, mockedData, realDataLoading, isLoading, realDataError, sp500Loading]);
  
  return {
    data: mergedData,
    isLoading: realDataLoading || (isLoading ?? false),
    error: realDataError instanceof Error ? realDataError : null,
  };
}

/**
 * Merge real and mocked data with progressive replacement
 * Real data replaces mocked data chronologically where available
 */
function mergeRealAndMockedData(
  realData: NetWorthPoint[],
  mockedData: NetWorthPoint[]
): NetWorthPoint[] {
  // Create a map of real data by date for O(1) lookup
  const realDataMap = new Map(realData.map(d => [d.date, d.value]));
  
  // Replace mocked data with real data where available (progressive replacement)
  const merged = mockedData.map(point => {
    const realValue = realDataMap.get(point.date);
    return realValue !== undefined 
      ? { ...point, value: realValue } // Use real data
      : point; // Use mocked data
  });
  
  return merged;
}

// Note: applySampling and sampleMonthly functions removed.
// Sampling is now handled in NetWorthCard using time-period-aware sampleByTimePeriod function.
// This allows different sampling strategies for each time period (30d, 90d, 1y, 5y).

/**
 * Sample data points at regular intervals with optional year boundary preservation.
 * Flexible utility function that can be used for different time periods.
 * 
 * @param data - Array of net worth data points
 * @param intervalDays - Number of days between samples
 * @param preserveYearBoundaries - If true, ensures Jan 1 points are included (for 5y view)
 * @returns Sampled array of data points
 */
export function sampleEveryNDays(
  data: NetWorthPoint[],
  intervalDays: number,
  preserveYearBoundaries: boolean = false
): NetWorthPoint[] {
  if (data.length === 0) return data;
  if (data.length <= 2) return data; // Keep all if very few points
  
  const sampled: NetWorthPoint[] = [];
  const firstPoint = data[0]!;
  const lastPoint = data[data.length - 1]!;
  
  // Always include first point
  sampled.push(firstPoint);
  
  // Track which years we've included to ensure year boundaries are represented
  const includedYears = preserveYearBoundaries ? new Set<number>() : undefined;
  if (preserveYearBoundaries && includedYears) {
    const firstDate = new Date(firstPoint.date);
    includedYears.add(firstDate.getFullYear());
  }
  
  // Sample at intervals, but also ensure we include points at year boundaries if requested
  let lastSampledDate = new Date(firstPoint.date);
  
  for (let i = 1; i < data.length - 1; i++) {
    const point = data[i]!;
    const pointDate = new Date(point.date);
    const daysSinceLastSample = Math.floor(
      (pointDate.getTime() - lastSampledDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let shouldInclude = daysSinceLastSample >= intervalDays;
    
    // Preserve year boundaries if requested (for 5y view)
    if (preserveYearBoundaries && includedYears) {
      const pointYear = pointDate.getFullYear();
      const isYearBoundary = pointDate.getMonth() === 0 && 
                            pointDate.getDate() === 1 && 
                            !includedYears.has(pointYear);
      shouldInclude = shouldInclude || isYearBoundary;
      
      if (shouldInclude) {
        includedYears.add(pointYear);
      }
    }
    
    if (shouldInclude) {
      sampled.push(point);
      lastSampledDate = pointDate;
    }
  }
  
  // Always include last point (if different from first)
  if (lastPoint.date !== firstPoint.date) {
    sampled.push(lastPoint);
    if (preserveYearBoundaries && includedYears) {
      const lastDate = new Date(lastPoint.date);
      includedYears.add(lastDate.getFullYear());
    }
  }
  
  // Post-processing for year boundaries (only when preserveYearBoundaries is true)
  if (preserveYearBoundaries && includedYears) {
    // Ensure all years in range have at least one point
    const firstYear = new Date(firstPoint.date).getFullYear();
    const lastYear = new Date(lastPoint.date).getFullYear();
    const allYearsInRange = Array.from(
      { length: lastYear - firstYear + 1 },
      (_, i) => firstYear + i
    );
    
    // Find missing years and add the first available point for each
    for (const year of allYearsInRange) {
      if (!includedYears.has(year)) {
        // Find the first point in this year
        const yearPoint = data.find(point => {
          const pointDate = new Date(point.date);
          return pointDate.getFullYear() === year;
        });
        
        if (yearPoint) {
          // Insert in chronological order
          const insertIndex = sampled.findIndex(point => {
            const pointDate = new Date(point.date);
            return pointDate.getFullYear() > year;
          });
          
          if (insertIndex === -1) {
            sampled.push(yearPoint);
          } else {
            sampled.splice(insertIndex, 0, yearPoint);
          }
          includedYears.add(year);
        } else if (import.meta.env.DEV) {
          // Development-only warning if year boundary is missing
          console.warn(
            `[useNetWorthHistory] Missing data point for year ${year}. ` +
            `This may cause X-axis tick issues in 5y view.`
          );
        }
      }
    }
    
    // Sort by date to ensure chronological order after post-processing
    sampled.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return sampled;
}

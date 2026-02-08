/**
 * S&P 500 Historical Data Service
 * 
 * Fetches S&P 500 historical daily prices and calculates percentage changes.
 * Uses FRED API (free, official) with fallback to Yahoo Finance.
 * Implements caching to minimize API calls.
 */

export interface SP500PricePoint {
  date: string; // ISO date string (YYYY-MM-DD format)
  price: number; // S&P 500 closing price
}

export interface SP500ReturnPoint {
  date: string; // ISO date string (YYYY-MM-DD format)
  return: number; // Daily percentage return (e.g., 0.01 = 1%)
}

const CACHE_KEY_PREFIX = 'sp500_data_';
const CACHE_TIMESTAMP_KEY_PREFIX = 'sp500_timestamp_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached S&P 500 data
 */
function getCachedData(startDate: string, endDate: string): SP500PricePoint[] | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${startDate}_${endDate}`;
    const timestampKey = `${CACHE_TIMESTAMP_KEY_PREFIX}${startDate}_${endDate}`;
    
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (!cachedData || !cachedTimestamp) {
      return null;
    }
    
    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (now - timestamp < CACHE_DURATION_MS) {
      return JSON.parse(cachedData) as SP500PricePoint[];
    }
    
    // Cache expired, remove it
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
    return null;
  } catch (error) {
    console.warn('Failed to read S&P 500 cache:', error);
    return null;
  }
}

/**
 * Cache S&P 500 data
 */
function setCachedData(startDate: string, endDate: string, data: SP500PricePoint[]): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${startDate}_${endDate}`;
    const timestampKey = `${CACHE_TIMESTAMP_KEY_PREFIX}${startDate}_${endDate}`;
    
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timestampKey, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache S&P 500 data:', error);
  }
}

/**
 * Fetch S&P 500 data from FRED API
 */
async function fetchSP500FromFRED(
  startDate: string,
  endDate: string,
  apiKey?: string
): Promise<SP500PricePoint[] | null> {
  if (!apiKey) {
    return null;
  }
  
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=SP500&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`FRED API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.observations || !Array.isArray(data.observations)) {
      console.warn('FRED API returned invalid data format');
      return null;
    }
    
    const prices: SP500PricePoint[] = [];
    
    for (const obs of data.observations) {
      // FRED uses '.' for missing data
      if (obs.value !== '.' && obs.value !== null && obs.value !== undefined) {
        const price = parseFloat(obs.value);
        if (!isNaN(price) && price > 0) {
          prices.push({
            date: obs.date,
            price: price,
          });
        }
      }
    }
    
    return prices.length > 0 ? prices : null;
  } catch (error) {
    console.warn('Failed to fetch S&P 500 data from FRED:', error);
    return null;
  }
}

/**
 * Fetch S&P 500 data from Yahoo Finance (fallback)
 */
async function fetchSP500FromYahoo(
  startDate: string,
  endDate: string
): Promise<SP500PricePoint[] | null> {
  try {
    // Calculate range in days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Yahoo Finance range options: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    let range = '5y';
    if (daysDiff <= 5) range = '5d';
    else if (daysDiff <= 30) range = '1mo';
    else if (daysDiff <= 90) range = '3mo';
    else if (daysDiff <= 180) range = '6mo';
    else if (daysDiff <= 365) range = '1y';
    else if (daysDiff <= 730) range = '2y';
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=${range}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.chart?.result?.[0]?.timestamp || !data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
      console.warn('Yahoo Finance API returned invalid data format');
      return null;
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    
    const prices: SP500PricePoint[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const close = closes[i];
      
      if (timestamp && close !== null && close !== undefined && !isNaN(close) && close > 0) {
        const date = new Date(timestamp * 1000);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Only include dates within the requested range
        if (dateStr && dateStr >= startDate && dateStr <= endDate) {
          prices.push({
            date: dateStr,
            price: close,
          });
        }
      }
    }
    
    return prices.length > 0 ? prices : null;
  } catch (error) {
    console.warn('Failed to fetch S&P 500 data from Yahoo Finance:', error);
    return null;
  }
}

/**
 * Fetch S&P 500 historical data with caching and fallback chain
 * 
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of S&P 500 price points, or null if all sources fail
 */
export async function fetchSP500Data(
  startDate: string,
  endDate: string
): Promise<SP500PricePoint[] | null> {
  // Check cache first
  const cached = getCachedData(startDate, endDate);
  if (cached) {
    return cached;
  }
  
  // Try FRED API first (if API key is configured)
  const fredApiKey = import.meta.env.VITE_FRED_API_KEY;
  if (fredApiKey) {
    const fredData = await fetchSP500FromFRED(startDate, endDate, fredApiKey);
    if (fredData) {
      setCachedData(startDate, endDate, fredData);
      return fredData;
    }
  }
  
  // Fallback to Yahoo Finance
  const yahooData = await fetchSP500FromYahoo(startDate, endDate);
  if (yahooData) {
    setCachedData(startDate, endDate, yahooData);
    return yahooData;
  }
  
  // All sources failed
  return null;
}

/**
 * Calculate daily percentage returns from S&P 500 prices
 * 
 * @param prices - Array of S&P 500 price points (must be sorted by date)
 * @returns Array of daily return points
 */
export function getSP500DailyReturns(prices: SP500PricePoint[]): SP500ReturnPoint[] {
  if (prices.length < 2) {
    return [];
  }
  
  const returns: SP500ReturnPoint[] = [];
  
  // Sort by date to ensure chronological order
  const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  
  for (let i = 1; i < sortedPrices.length; i++) {
    const prevPoint = sortedPrices[i - 1];
    const currentPoint = sortedPrices[i];
    
    if (!prevPoint || !currentPoint) {
      continue;
    }
    
    const prevPrice = prevPoint.price;
    const currentPrice = currentPoint.price;
    const currentDate = currentPoint.date;
    
    if (prevPrice > 0 && currentPrice > 0) {
      const dailyReturn = (currentPrice - prevPrice) / prevPrice;
      returns.push({
        date: currentDate,
        return: dailyReturn,
      });
    }
  }
  
  return returns;
}

/**
 * Get S&P 500 return for a specific date
 * Handles non-trading days by using the previous trading day's return
 * 
 * IMPORTANT: S&P 500 returns are calculated between consecutive trading days.
 * The return for date D represents the change FROM the previous trading day TO date D.
 * When going backwards in time, we use the return for date D to calculate the value for the previous day.
 * 
 * @param date - Target date (YYYY-MM-DD)
 * @param returns - Array of S&P 500 return points (must be sorted by date)
 * @returns Daily return value, or a special marker value if not found (to distinguish from 0% return)
 */
export function getSP500ReturnForDate(
  date: string,
  returns: SP500ReturnPoint[]
): number | null {
  if (returns.length === 0) {
    return null; // Return null to indicate no data available (distinct from 0% return)
  }
  
  // Sort by date to ensure chronological order
  const sortedReturns = [...returns].sort((a, b) => a.date.localeCompare(b.date));
  
  // Try exact match first
  const exactMatch = sortedReturns.find(r => r.date === date);
  if (exactMatch) {
    return exactMatch.return;
  }
  
  // Find the most recent return before or on this date
  // This handles non-trading days (weekends, holidays) by using the previous trading day's return
  let closestReturn: SP500ReturnPoint | null = null;
  
  for (const ret of sortedReturns) {
    if (ret && ret.date <= date) {
      closestReturn = ret;
    } else {
      break;
    }
  }
  
  // Return the closest return, or null if none found (to distinguish from 0% return)
  return closestReturn?.return ?? null;
}

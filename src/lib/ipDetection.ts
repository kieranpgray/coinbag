/**
 * IP Detection Service
 * 
 * Detects user's country from IP address using free geolocation APIs.
 * Results are cached in localStorage to minimize API calls.
 * 
 * Uses ipapi.co (free tier: 1000 requests/day) or ip-api.com (45 requests/minute)
 * Falls back gracefully if API fails or returns unsupported country.
 */

import { getLocaleFromCountry } from './localeRegistry';

const CACHE_KEY = 'ip_detected_country';
const CACHE_TIMESTAMP_KEY = 'ip_detected_country_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached IP detection result
 * 
 * @returns Cached country code or null if cache expired/missing
 */
function getCachedCountry(): string | null {
  try {
    const cachedCountry = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedCountry || !cachedTimestamp) {
      return null;
    }
    
    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (now - timestamp < CACHE_DURATION_MS) {
      return cachedCountry;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return null;
  } catch (error) {
    // localStorage might not be available (SSR, private browsing, etc.)
    console.warn('Failed to read IP detection cache:', error);
    return null;
  }
}

/**
 * Cache IP detection result
 * 
 * @param country - Country code to cache
 */
function setCachedCountry(country: string): void {
  try {
    localStorage.setItem(CACHE_KEY, country);
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    // localStorage might not be available
    console.warn('Failed to cache IP detection result:', error);
  }
}

/**
 * Detect country from IP using ipapi.co
 * 
 * @returns Country code (ISO 3166-1 alpha-2) or null if detection fails
 */
async function detectCountryFromIPAPI(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/country/', {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
    });
    
    // Handle 406 Not Acceptable - API may require different Accept header or have rate limits
    if (response.status === 406) {
      return null;
    }
    
    if (!response.ok) {
      return null;
    }
    
    const countryCode = await response.text();
    
    // Validate country code format (2 uppercase letters)
    if (/^[A-Z]{2}$/.test(countryCode.trim())) {
      return countryCode.trim();
    }
    
    return null;
  } catch (error) {
    // Silently fail - this is a fallback service
    return null;
  }
}

/**
 * Detect country from IP using ip-api.com (fallback)
 * 
 * @returns Country code (ISO 3166-1 alpha-2) or null if detection fails
 */
async function detectCountryFromIPAPICom(): Promise<string | null> {
  try {
    // Use HTTPS to avoid mixed content errors
    const response = await fetch('https://ip-api.com/json/?fields=countryCode', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.countryCode && /^[A-Z]{2}$/.test(data.countryCode)) {
      return data.countryCode;
    }
    
    return null;
  } catch (error) {
    // Silently fail - this is a fallback service
    return null;
  }
}

/**
 * Detect country from user's IP address
 * 
 * Uses cached result if available and still valid (24 hours).
 * Otherwise calls geolocation API and caches the result.
 * 
 * @returns Country code (ISO 3166-1 alpha-2) or null if detection fails
 */
export async function detectCountryFromIP(): Promise<string | null> {
  // Check cache first
  const cached = getCachedCountry();
  if (cached) {
    return cached;
  }
  
  // Try ipapi.co first (preferred)
  let country = await detectCountryFromIPAPI();
  
  // Fallback to ip-api.com if first attempt fails
  if (!country) {
    country = await detectCountryFromIPAPICom();
  }
  
  // Cache result if successful
  if (country) {
    setCachedCountry(country);
  }
  
  return country;
}

/**
 * Detect locale from user's IP address
 * 
 * Maps detected country to supported locale using locale registry.
 * 
 * @returns Locale code (e.g., 'en-US', 'en-AU') or null if detection fails or country not supported
 */
export async function detectLocaleFromIP(): Promise<string | null> {
  const country = await detectCountryFromIP();
  
  if (!country) {
    return null;
  }
  
  return getLocaleFromCountry(country);
}


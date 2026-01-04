import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger, getCorrelationId } from './logger';
import { logJwtDiagnostics, logJwtSentToSupabase, extractUserIdFromToken, isTokenExpiredOrExpiringSoon } from './jwtDiagnostics';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with lazy initialization
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.'
      );
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof SupabaseClient];
  },
});

/**
 * Helper function to get a fresh Clerk JWT token
 * This is used by API adapters to authenticate requests
 * Note: This function must be called from within a React component that has access to Clerk hooks
 */
export const getClerkToken = async (getToken: () => Promise<string | null>): Promise<string | null> => {
  try {
    const token = await getToken();
    
    // Log JWT diagnostics if debug logging is enabled
    if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      logJwtDiagnostics(token, 'getClerkToken');
    }
    
    return token;
  } catch (error) {
    const correlationId = getCorrelationId();
    logger.error(
      'JWT:ERROR',
      'Failed to get Clerk token',
      { error: error instanceof Error ? error.message : String(error) },
      correlationId || undefined
    );
    return null;
  }
};

// Cache authenticated clients per token to avoid creating multiple instances
// Note: Tokens can expire, so we use a simple cache with token as key
// Using a more aggressive cache to reduce GoTrueClient instance warnings
const authenticatedClientCache = new Map<string, { client: SupabaseClient; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (increased from 5 to reduce instance creation)
const MAX_CACHE_SIZE = 5; // Reduced from 10 to keep cache smaller and more focused

/**
 * Create an authenticated Supabase client for a specific request
 * This injects the Clerk JWT token into the request headers
 * Uses caching to avoid creating multiple client instances with the same token
 * 
 * Note: The "Multiple GoTrueClient instances" warning is non-critical and can be ignored.
 * It occurs because Supabase creates a new GoTrueClient for each client instance.
 * The caching helps reduce instances, but some warnings may still appear.
 */
export const createAuthenticatedSupabaseClient = async (
  getToken: () => Promise<string | null>
): Promise<SupabaseClient> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.'
    );
  }

  const token = await getClerkToken(getToken);

  if (!token) {
    const correlationId = getCorrelationId();
    logger.error(
      'JWT:ERROR',
      'No authentication token available when creating Supabase client',
      {},
      correlationId || undefined
    );
    throw new Error('No authentication token available. Please sign in.');
  }

  // Log JWT diagnostics if debug logging is enabled
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logJwtSentToSupabase(token, 'createAuthenticatedSupabaseClient');
  }

  // Check if token is expired or expiring soon (within 60 seconds)
  if (isTokenExpiredOrExpiringSoon(token, 60)) {
    const correlationId = getCorrelationId();
    logger.warn(
      'JWT:WARNING',
      'JWT token is expired or expiring soon, clearing cache and getting fresh token',
      {},
      correlationId || undefined
    );
    // Clear cache for this token
    authenticatedClientCache.delete(token);
    // Get a fresh token
    const freshToken = await getClerkToken(getToken);
    if (freshToken && freshToken !== token) {
      // Use fresh token
      const freshCached = authenticatedClientCache.get(freshToken);
      if (freshCached && (Date.now() - freshCached.timestamp) < CLIENT_CACHE_TTL_MS) {
        return freshCached.client;
      }
      // Create new client with fresh token
      const freshClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${freshToken}`,
              'x-correlation-id': getCorrelationId() || '',
            },
          },
        }
      );
      authenticatedClientCache.set(freshToken, { client: freshClient, timestamp: Date.now() });
      return freshClient;
    }
  }

  // Check cache first - reuse existing client if available
  const cached = authenticatedClientCache.get(token);
  const now = Date.now();
  if (cached) {
    // Extend cache TTL if still within reasonable time
    if ((now - cached.timestamp) < CLIENT_CACHE_TTL_MS) {
      return cached.client;
    }
    // If slightly expired but token hasn't changed, still reuse (token refresh will handle expiration)
    if ((now - cached.timestamp) < CLIENT_CACHE_TTL_MS * 1.5) {
      // Update timestamp to extend cache life
      cached.timestamp = now;
      return cached.client;
    }
  }

  // Create a new client instance with custom headers for this request
  const correlationId = getCorrelationId();
  logger.debug(
    'SUPABASE:CLIENT',
    'Creating authenticated Supabase client',
    {
      hasToken: !!token,
      tokenLength: token.length,
      correlationId: correlationId || 'none',
    },
    correlationId || undefined
  );

  const client = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-correlation-id': correlationId || '',
        },
      },
    }
  );

  // Cache the client
  authenticatedClientCache.set(token, { client, timestamp: now });

  // Clean up old cache entries (keep cache size reasonable)
  // More aggressive cleanup to reduce memory usage and instance count
  if (authenticatedClientCache.size > MAX_CACHE_SIZE) {
    // Sort by timestamp and remove oldest entries
    const entries = Array.from(authenticatedClientCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      authenticatedClientCache.delete(key);
    }
  }
  
  // Also clean up expired entries periodically
  for (const [key, value] of authenticatedClientCache.entries()) {
    if ((now - value.timestamp) >= CLIENT_CACHE_TTL_MS * 2) {
      authenticatedClientCache.delete(key);
    }
  }

  return client;
};

/**
 * Check if user is authenticated (has valid Clerk session)
 */
export const isAuthenticated = async (getToken: () => Promise<string | null>): Promise<boolean> => {
  try {
    const token = await getClerkToken(getToken);
    return token !== null;
  } catch {
    return false;
  }
};

/**
 * Get current user ID from Clerk
 * This should match the user_id in Supabase RLS policies
 */
export const getCurrentUserId = async (getUserId: () => string | null): Promise<string | null> => {
  try {
    return getUserId();
  } catch (error) {
    // Log error only if debug logging is enabled
    if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      const { logger, getCorrelationId } = await import('./logger');
      logger.error(
        'AUTH:USER_ID',
        'Failed to get current user ID',
        { error: error instanceof Error ? error.message : String(error) },
        getCorrelationId() || undefined
      );
    }
    return null;
  }
};

/**
 * Get user ID from JWT token
 * This is the preferred method as it extracts directly from the JWT
 */
export const getUserIdFromToken = async (getToken: () => Promise<string | null>): Promise<string | null> => {
  try {
    const token = await getClerkToken(getToken);
    return extractUserIdFromToken(token);
  } catch (error) {
    const correlationId = getCorrelationId();
    logger.error(
      'JWT:ERROR',
      'Failed to get user ID from token',
      { error: error instanceof Error ? error.message : String(error) },
      correlationId || undefined
    );
    return null;
  }
};

export default supabase;

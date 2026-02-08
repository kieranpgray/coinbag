import { SupabaseClient } from '@supabase/supabase-js';
import { logger, getCorrelationId } from './logger';
import { logJwtDiagnostics, logJwtSentToSupabase, extractUserIdFromToken } from './jwtDiagnostics';
import { getSupabaseBrowserClient } from './supabase/supabaseBrowserClient';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use singleton browser client
const getSupabaseClient = (): SupabaseClient => {
  return getSupabaseBrowserClient();
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof SupabaseClient];
  },
});

/**
 * Helper function to get a fresh Clerk JWT token
 * 
 * Uses Clerk's default session token (no template) which works automatically
 * with Supabase Third-Party Auth via JWKS verification.
 * 
 * Note: JWT templates are deprecated (April 2025). Third-Party Auth uses
 * Clerk's default session tokens which are signed with RS256 and verified
 * via JWKS endpoint.
 * 
 * @param getToken Function to retrieve Clerk session token
 * @returns Clerk JWT token or null if unavailable
 */
export const getClerkToken = async (getToken: () => Promise<string | null>): Promise<string | null> => {
  try {
    // Use Clerk's default session token (no template parameter)
    // This works automatically with Supabase Third-Party Auth
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

/**
 * Create an authenticated Supabase client for a specific request
 * 
 * Uses Supabase's global.headers option to automatically include Clerk JWT
 * in all requests (REST, Storage, Realtime). This is the recommended approach
 * for Third-Party Auth integration.
 * 
 * The client is created with a per-request token fetching function, ensuring
 * fresh tokens are used for each operation.
 * 
 * @param getToken Function to retrieve Clerk session token
 * @returns Authenticated Supabase client instance
 */
export const createAuthenticatedSupabaseClient = async (
  getToken: () => Promise<string | null>
): Promise<SupabaseClient> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.'
    );
  }

  // Verify token is available (but don't fetch it yet - let client fetch per-request)
  const testToken = await getClerkToken(getToken);
  if (!testToken) {
    const correlationId = getCorrelationId();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const keyFormat = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ? 'new (sb_publishable_)' : 
                     import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'legacy (JWT)' : 'unknown';
    
    logger.error(
      'JWT:ERROR',
      'No authentication token available when creating Supabase client',
      {
        supabaseUrl,
        keyFormat,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      correlationId || undefined
    );
    throw new Error('No authentication token available. Please sign in.');
  }

  // Log JWT diagnostics if debug logging is enabled
  if (import.meta.env.VITE_DEBUG_LOGGING === 'true') {
    logJwtSentToSupabase(testToken, 'createAuthenticatedSupabaseClient');
  }

  const correlationId = getCorrelationId();

  // Get or create client with getToken function
  // The client will use global.headers to inject JWT per-request
  const client = getSupabaseBrowserClient(getToken);

  logger.debug(
    'SUPABASE:CLIENT',
    'Using client with Clerk JWT via global.headers',
    {
      hasToken: !!testToken,
      tokenLength: testToken.length,
      correlationId: correlationId || 'none',
    },
    correlationId || undefined
  );

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

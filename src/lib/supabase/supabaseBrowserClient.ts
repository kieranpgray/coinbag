import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
// Use closure-based token getter instead of function reference comparison
// This allows updating the token getter without recreating the client
let _tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Get or create the Supabase browser client singleton
 * 
 * When getToken is provided, the client will automatically include the Clerk JWT
 * in all requests (REST, Storage, Realtime) via a custom fetch wrapper.
 * 
 * Uses a closure-based approach to avoid unnecessary client recreation when
 * different function instances are passed (which would always fail with reference comparison).
 * 
 * @param getToken Optional function to retrieve Clerk JWT token per-request
 * @returns Supabase client instance
 */
export function getSupabaseBrowserClient(
  getToken?: () => Promise<string | null>
): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  // Create client once if it doesn't exist, or if we need to add token support
  // Use closure-based approach: update token getter without recreating client
  const needsTokenSupport = getToken && !_tokenGetter;
  const shouldRecreate = !_supabase || needsTokenSupport;

  if (shouldRecreate) {
    // Update token getter (closure will capture this)
    _tokenGetter = getToken || null;

    // Build client options
    const clientOptions: any = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // IMPORTANT: stable key avoids cross-client collisions
        storageKey: "wellthy-auth",
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    };

    // If getToken is provided, use custom fetch to inject JWT per-request
    // This ensures JWT is sent for ALL operations (REST, Storage, Realtime)
    if (_tokenGetter) {
      // Store original fetch
      const originalFetch = globalThis.fetch;
      
      // Create custom fetch that adds Authorization header
      // Uses closure to access _tokenGetter, which can be updated without recreating client
      const customFetch: typeof fetch = async (input, init = {}) => {
        // Get token from closure-captured getter
        const token = await _tokenGetter!();
        
        // Enhanced debug logging in dev mode for verification
        if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGGING === 'true') {
          const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input instanceof Request ? input.url : String(input)));
          const method = init.method || 'GET';
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const keyFormat = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_') ? 'new (sb_publishable_)' : 
                           import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'legacy (JWT)' : 'unknown';
          
          console.log('[Supabase Fetch]', {
            url: url.substring(0, 100), // Truncate long URLs
            method,
            hasToken: !!token,
            tokenLength: token?.length || 0,
            supabaseUrl,
            keyFormat,
            timestamp: new Date().toISOString(),
          });
          
          // Log authentication errors with more detail
          if (url.includes('/rest/v1/') && !token) {
            console.warn('[Supabase Fetch] ⚠️  Request to protected endpoint without JWT token:', {
              url: url.substring(0, 100),
              method,
            });
          }
        }
        
        // Handle headers properly (can be Headers object, object, or array)
        const headers = new Headers(init.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        
        // Clone init to avoid mutating original
        const customInit: RequestInit = {
          ...init,
          headers,
        };
        
        return originalFetch(input, customInit);
      };
      
      clientOptions.global = {
        fetch: customFetch,
      };
    }

    _supabase = createClient(url, anonKey, clientOptions);

    // Dev-only guard to detect accidental re-creation
    if (import.meta.env.DEV) {
      (window as any).__wellthy_supabase_singleton__ =
        (window as any).__wellthy_supabase_singleton__ ?? _supabase;

      if ((window as any).__wellthy_supabase_singleton__ !== _supabase) {
        console.error("[Supabase] Multiple singleton instances detected (should never happen).");
      }
    }
  } else if (getToken && _tokenGetter !== getToken) {
    // Update token getter without recreating client (closure will use new getter)
    _tokenGetter = getToken;
  }

  // At this point, _supabase is guaranteed to be non-null
  return _supabase!;
}


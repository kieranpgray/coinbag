/**
 * Environment variable validation and utilities
 * 
 * Validates required environment variables at app startup and provides
 * utilities for checking configuration state.
 */

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Detect production mode
const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;

/**
 * Validate environment variables and log warnings/errors
 * Should be called at app startup
 * 
 * CRITICAL: In production, Supabase MUST be configured or the app will fail to start
 */
export function validateEnvironment(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  shouldBlockStartup: boolean;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  let shouldBlockStartup = false;

  // Clerk is always required
  if (!CLERK_PUBLISHABLE_KEY) {
    errors.push('VITE_CLERK_PUBLISHABLE_KEY is required but not set');
    if (isProduction) {
      shouldBlockStartup = true;
    }
  } else {
    // Validate Clerk key format matches environment
    const isDev = !isProduction;
    const isProductionKey = CLERK_PUBLISHABLE_KEY.startsWith('pk_live_');
    const isTestKey = CLERK_PUBLISHABLE_KEY.startsWith('pk_test_');
    
    if (isDev && isProductionKey) {
      warnings.push(
        '⚠️ Production Clerk key detected in development mode. ' +
        'Production keys are domain-restricted and will cause authentication failures on localhost. ' +
        'Use test key (pk_test_...) for local development. ' +
        'Get test key from: https://dashboard.clerk.com → API Keys → Test tab'
      );
    }
    
    if (isProduction && isTestKey) {
      const errorMsg = 'CRITICAL: Test Clerk key detected in production. Use production key (pk_live_...) for production builds.';
      errors.push(errorMsg);
      shouldBlockStartup = true;
      console.error('🚨 PRODUCTION ERROR:', errorMsg);
      console.error('   → Get production key from: https://dashboard.clerk.com → API Keys → Production tab');
    }
    
    if (!isProductionKey && !isTestKey) {
      warnings.push(
        `Invalid Clerk key format: "${CLERK_PUBLISHABLE_KEY.substring(0, 20)}...". ` +
        'Expected format: pk_test_... (development) or pk_live_... (production)'
      );
    }
  }

  // CRITICAL: In production, Supabase MUST be configured
  if (isProduction) {
    if (DATA_SOURCE !== 'supabase') {
      const errorMsg = 'CRITICAL: VITE_DATA_SOURCE must be set to "supabase" in production. Data will not persist!';
      errors.push(errorMsg);
      shouldBlockStartup = true;
      console.error('🚨 PRODUCTION ERROR:', errorMsg);
      console.error('   → Set VITE_DATA_SOURCE=supabase in your production environment variables');
      console.error('   → Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    
    if (DATA_SOURCE === 'supabase') {
      if (!SUPABASE_URL) {
        const errorMsg = 'CRITICAL: VITE_SUPABASE_URL is required in production when VITE_DATA_SOURCE=supabase';
        errors.push(errorMsg);
        shouldBlockStartup = true;
        console.error('🚨 PRODUCTION ERROR:', errorMsg);
      }
      if (!SUPABASE_ANON_KEY) {
        const errorMsg = 'CRITICAL: VITE_SUPABASE_ANON_KEY is required in production when VITE_DATA_SOURCE=supabase';
        errors.push(errorMsg);
        shouldBlockStartup = true;
        console.error('🚨 PRODUCTION ERROR:', errorMsg);
      }
    }
  } else {
    // Development mode - warnings only
    if (DATA_SOURCE === 'supabase') {
      if (!SUPABASE_URL) {
        errors.push('VITE_SUPABASE_URL is required when VITE_DATA_SOURCE=supabase');
      }
      if (!SUPABASE_ANON_KEY) {
        errors.push('VITE_SUPABASE_ANON_KEY is required when VITE_DATA_SOURCE=supabase');
      }
    } else if (DATA_SOURCE === 'mock') {
      warnings.push(
        'VITE_DATA_SOURCE=mock is set. Data will not persist across sessions. ' +
        'Set VITE_DATA_SOURCE=supabase for production persistence.'
      );
    } else {
      warnings.push(
        `Unknown VITE_DATA_SOURCE="${DATA_SOURCE}". Falling back to mock repository.`
      );
    }
  }

  // Log warnings and errors
  if (warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:', warnings);
  }
  if (errors.length > 0) {
    console.error('❌ Environment Errors:', errors);
  }

  if (shouldBlockStartup) {
    console.error('');
    console.error('🚨 APPLICATION BLOCKED: Critical configuration errors detected in production.');
    console.error('   → Fix environment variables and rebuild/redeploy');
    console.error('   → See docs/PRODUCTION_DEPLOYMENT.md for setup instructions');
    console.error('');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    shouldBlockStartup,
  };
}

/**
 * Get the current data source mode
 * 
 * CRITICAL: In production, this will throw an error if Supabase is not configured
 */
export function getDataSource(): 'mock' | 'supabase' {
  // In production, force Supabase - fail fast if not configured
  if (isProduction && DATA_SOURCE !== 'supabase') {
    throw new Error(
      'CRITICAL: VITE_DATA_SOURCE must be "supabase" in production. ' +
      'Data will not persist if mock repository is used. ' +
      'Set VITE_DATA_SOURCE=supabase in production environment variables.'
    );
  }
  
  return DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';
}

/**
 * Check if Supabase is enabled
 */
export function isSupabaseEnabled(): boolean {
  return DATA_SOURCE === 'supabase' && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Get repository type string for logging
 */
export function getRepositoryType(repositoryName: string): string {
  const source = getDataSource();
  return source === 'supabase' ? `Supabase${repositoryName}` : `Mock${repositoryName}`;
}

// Validate on module load (only in browser, not in tests)
if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  const validation = validateEnvironment();
  
  // Runtime check: Warn if mock repository is being used in what appears to be production
  // This catches cases where build-time env vars were not set correctly
  if (isProduction && DATA_SOURCE === 'mock') {
    console.error('');
    console.error('🚨 RUNTIME WARNING: Mock repository detected in production build!');
    console.error('   This indicates VITE_DATA_SOURCE was not set at build time.');
    console.error('   Data will not persist. Rebuild with VITE_DATA_SOURCE=supabase');
    console.error('   See docs/PRODUCTION_DEPLOYMENT.md for setup instructions');
    console.error('');
  }
  
  // In production, block startup if critical errors
  if (validation.shouldBlockStartup) {
    // Show user-friendly error message
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
        background: #fef2f2;
        color: #991b1b;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
        <div style="max-width: 600px; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="margin-bottom: 1rem; font-size: 1.1rem;">
            This application requires Supabase to be configured for data persistence.
          </p>
          <p style="margin-bottom: 1.5rem; color: #666;">
            The following environment variables must be set:
          </p>
          <ul style="list-style: disc; margin-left: 2rem; margin-bottom: 1.5rem; color: #666;">
            <li><code style="background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px;">VITE_DATA_SOURCE=supabase</code></li>
            <li><code style="background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px;">VITE_SUPABASE_URL</code></li>
            <li><code style="background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px;">VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p style="color: #666; margin-bottom: 1rem;">
            <strong>Errors detected:</strong>
          </p>
          <ul style="list-style: disc; margin-left: 2rem; color: #dc2626;">
            ${validation.errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
          <p style="margin-top: 1.5rem; color: #666; font-size: 0.9rem;">
            Please contact your administrator or see the deployment documentation for setup instructions.
          </p>
        </div>
      </div>
    `;
    
    // Also throw to prevent further execution
    throw new Error('Application blocked: Critical configuration errors in production. See console for details.');
  }
}


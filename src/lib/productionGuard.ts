/**
 * Production Guard
 * 
 * Prevents the application from running in production without proper Supabase configuration.
 * This ensures data persistence is always enabled in production builds.
 */

const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'mock';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Check if production configuration is valid
 * Returns error message if invalid, null if valid
 */
export function validateProductionConfig(): string | null {
  if (!isProduction) {
    return null; // Not in production, skip validation
  }

  if (DATA_SOURCE !== 'supabase') {
    return `VITE_DATA_SOURCE must be "supabase" in production. Current value: "${DATA_SOURCE}". Data will not persist!`;
  }

  if (!SUPABASE_URL) {
    return 'VITE_SUPABASE_URL is required in production. Data will not persist without Supabase!';
  }

  if (!SUPABASE_ANON_KEY) {
    return 'VITE_SUPABASE_ANON_KEY is required in production. Data will not persist without Supabase!';
  }

  return null; // Configuration is valid
}

/**
 * Guard function to prevent mock repository usage in production
 */
export function guardProductionRepository(repositoryName: string): void {
  if (isProduction && DATA_SOURCE !== 'supabase') {
    const error = new Error(
      `CRITICAL: Cannot use mock ${repositoryName} in production. ` +
      `Set VITE_DATA_SOURCE=supabase in production environment variables. ` +
      `Data will not persist if mock repository is used.`
    );
    console.error('🚨 PRODUCTION ERROR:', error.message);
    throw error;
  }
}


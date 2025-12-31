#!/usr/bin/env node
/**
 * Build-time validation
 * 
 * 1. Validates environment variables (VITE_DATA_SOURCE must be 'supabase' in production)
 * 2. Validates TypeScript compilation (no type errors allowed)
 * 
 * This prevents accidentally building with mock repository or broken TypeScript code.
 */

// Detect production mode
// Production if:
// 1. NODE_ENV is explicitly set to 'production'
// 2. Running vite build (not vite dev)
// 3. --mode production flag is present
const isRunningBuild = process.argv.some(arg => 
  arg.includes('vite') && arg.includes('build') || 
  process.argv.includes('build')
);
const hasProductionMode = process.argv.some((arg, i) => 
  arg === '--mode' && process.argv[i + 1] === 'production'
);
const isProduction = process.env.NODE_ENV === 'production' || 
                     hasProductionMode ||
                     (isRunningBuild && process.env.NODE_ENV !== 'development');

const dataSource = process.env.VITE_DATA_SOURCE;

if (isProduction && dataSource !== 'supabase') {
  console.error('');
  console.error('❌ BUILD FAILED: VITE_DATA_SOURCE must be "supabase" in production');
  console.error(`   Current value: "${dataSource || 'undefined (defaults to mock)'}"`);
  console.error('');
  console.error('   This would cause all user data to be lost on every deployment.');
  console.error('   Set VITE_DATA_SOURCE=supabase before building.');
  console.error('');
  console.error('   Example:');
  console.error('     VITE_DATA_SOURCE=supabase \\');
  console.error('     VITE_SUPABASE_URL=https://your-project.supabase.co \\');
  console.error('     VITE_SUPABASE_ANON_KEY=your-key \\');
  console.error('     pnpm build');
  console.error('');
  process.exit(1);
}

if (isProduction && dataSource === 'supabase') {
  console.log('✅ Build validation passed: VITE_DATA_SOURCE=supabase');
  
  // Also check for required Supabase credentials
  if (!process.env.VITE_SUPABASE_URL) {
    console.warn('⚠️  WARNING: VITE_SUPABASE_URL is not set');
  }
  if (!process.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️  WARNING: VITE_SUPABASE_ANON_KEY is not set');
  }
  
  // Validate Supabase URL format
  if (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.match(/^https:\/\/.*\.supabase\.co$/)) {
    console.error('');
    console.error('❌ BUILD FAILED: VITE_SUPABASE_URL must be a valid Supabase URL');
    console.error(`   Current value: "${process.env.VITE_SUPABASE_URL}"`);
    console.error('   Expected format: https://<project-id>.supabase.co');
    console.error('');
    process.exit(1);
  }
}

// CRITICAL: Validate Clerk key format in production
const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
if (isProduction && clerkKey) {
  if (clerkKey.startsWith('pk_test_')) {
    console.error('');
    console.error('❌ BUILD FAILED: Test Clerk key detected in production');
    console.error('   Clerk publishable key starts with "pk_test_" which is for development only.');
    console.error('   Use production key (pk_live_...) in production builds.');
    console.error('');
    console.error('   Get production key from:');
    console.error('   Clerk Dashboard → API Keys → Production tab');
    console.error('');
    process.exit(1);
  }
  
  if (!clerkKey.startsWith('pk_live_') && !clerkKey.startsWith('pk_test_')) {
    console.error('');
    console.error('❌ BUILD FAILED: Invalid Clerk key format');
    console.error(`   Current value: "${clerkKey.substring(0, 20)}..."`);
    console.error('   Clerk keys must start with "pk_live_" (production) or "pk_test_" (development)');
    console.error('');
    process.exit(1);
  }
  
  if (clerkKey.startsWith('pk_live_')) {
    console.log('✅ Clerk production key detected');
  }
} else if (isProduction && !clerkKey) {
  console.error('');
  console.error('❌ BUILD FAILED: VITE_CLERK_PUBLISHABLE_KEY is required in production');
  console.error('');
  process.exit(1);
}

// Note: TypeScript validation is handled by the build script itself
// (via `tsc --noEmit` in package.json), so we don't duplicate it here.
// This script focuses on environment variable validation.


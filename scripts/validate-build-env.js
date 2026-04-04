#!/usr/bin/env node
/**
 * Build-time environment validation.
 *
 * Production contract:
 * - Strictly enforced on Vercel Production deployments.
 * - Fails early if required env vars are missing/invalid.
 */

const args = process.argv.slice(2);
const reportOnly = args.includes('--report-only');

const hasProductionMode = process.argv.some(
  (arg, i) => arg === '--mode' && process.argv[i + 1] === 'production'
);
const isVercel = process.env.VERCEL === '1';
const vercelEnv = process.env.VERCEL_ENV;
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'unknown';
const isVercelProduction = isVercel && vercelEnv === 'production';
const isNodeProduction = process.env.NODE_ENV === 'production';
const isProduction = isNodeProduction || isVercelProduction || hasProductionMode;
const strictProductionGate = isVercelProduction;

const dataSource = process.env.VITE_DATA_SOURCE;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

function logValidationContext() {
  console.log('🔎 Build environment validation');
  console.log(
    `   context: vercel=${isVercel ? '1' : '0'}, vercelEnv=${vercelEnv || 'unset'}, branch=${branch}, nodeEnv=${process.env.NODE_ENV || 'unset'}`
  );
  console.log(`   strictProductionGate=${strictProductionGate ? 'true' : 'false'}`);
}

function fail(lines) {
  console.error('');
  for (const line of lines) {
    console.error(line);
  }
  console.error('');
  if (!reportOnly) {
    process.exit(1);
  }
}

function validateSupabaseUrl(url) {
  return /^https:\/\/.*\.supabase\.co$/.test(url);
}

logValidationContext();

if (isProduction && dataSource !== 'supabase') {
  fail([
    '❌ BUILD FAILED: VITE_DATA_SOURCE must be "supabase" in production',
    `   Current value: "${dataSource || 'undefined (defaults to mock)'}"`,
    '   This would cause all user data to be lost on every deployment.',
    '   Set VITE_DATA_SOURCE=supabase in Vercel Project Settings → Environment Variables.',
  ]);
}

if (strictProductionGate) {
  const missingKeys = [];

  if (!dataSource) missingKeys.push('VITE_DATA_SOURCE');
  if (!supabaseUrl) missingKeys.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingKeys.push('VITE_SUPABASE_ANON_KEY');
  if (!clerkKey) missingKeys.push('VITE_CLERK_PUBLISHABLE_KEY');

  if (missingKeys.length > 0) {
    fail([
      '❌ BUILD FAILED: Missing required Vercel Production environment variables',
      `   Missing: ${missingKeys.join(', ')}`,
      '   Set these in Vercel → Project Settings → Environment Variables (Production scope).',
    ]);
  }

  if (dataSource !== 'supabase') {
    fail([
      '❌ BUILD FAILED: VITE_DATA_SOURCE must be "supabase" on Vercel Production deployments',
      `   Current value: "${dataSource || 'unset'}"`,
    ]);
  }

  if (supabaseUrl && !validateSupabaseUrl(supabaseUrl)) {
    fail([
      '❌ BUILD FAILED: VITE_SUPABASE_URL must be a valid Supabase URL',
      `   Current value: "${supabaseUrl}"`,
      '   Expected format: https://<project-id>.supabase.co',
    ]);
  }
}

if (isProduction && dataSource === 'supabase') {
  console.log('✅ Build validation passed: VITE_DATA_SOURCE=supabase');
}

if (clerkKey) {
  const isProductionKey = clerkKey.startsWith('pk_live_');
  const isTestKey = clerkKey.startsWith('pk_test_');

  if (strictProductionGate) {
    if (isTestKey) {
      fail([
        '❌ BUILD FAILED: Test Clerk key detected in Vercel Production',
        '   Use production key (pk_live_...) in Vercel Production environment variables.',
      ]);
    }

    if (!isProductionKey && !isTestKey) {
      fail([
        '❌ BUILD FAILED: Invalid Clerk key format',
        `   Current value: "${clerkKey.substring(0, 20)}..."`,
        '   Clerk keys must start with "pk_live_" (production) or "pk_test_" (development).',
      ]);
    }

    if (isProductionKey) {
      console.log('✅ Clerk production key detected');
    }
  }

  const isDevelopment = !isProduction;
  if (isDevelopment && isProductionKey) {
    console.warn('');
    console.warn('⚠️  WARNING: Production Clerk key detected in development mode');
    console.warn('   Production keys are domain-restricted and can fail on localhost.');
    console.warn('   Use test key (pk_test_...) for local development.');
    console.warn('');
  }
} else if (strictProductionGate) {
  fail([
    '❌ BUILD FAILED: VITE_CLERK_PUBLISHABLE_KEY is required in Vercel Production',
  ]);
}

if (strictProductionGate && !reportOnly) {
  console.log('✅ Production environment contract validated');
}

if (reportOnly) {
  console.log('ℹ️  Report-only mode enabled; validation failures were not blocking.');
}


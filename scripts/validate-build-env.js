#!/usr/bin/env node
/**
 * Build-time environment variable validation
 * 
 * Fails the build if VITE_DATA_SOURCE is not set to 'supabase' in production mode.
 * This prevents accidentally building with mock repository, which would cause data loss.
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
}


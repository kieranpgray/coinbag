#!/usr/bin/env tsx
/**
 * Development Environment Validation
 * 
 * Validates that development environment variables are correctly configured.
 * Specifically checks for production keys in development files.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const envContent = readFileSync(filePath, 'utf8');
    const env: Record<string, string> = {};

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    }

    return env;
  } catch (error) {
    return {};
  }
}

console.log('🔍 Development Environment Validation');
console.log('=====================================\n');

const envPath = join(PROJECT_ROOT, '.env');
const env = loadEnvFile(envPath);

if (Object.keys(env).length === 0) {
  console.error('❌ Error: Could not read .env file');
  process.exit(1);
}

const clerkKey = env.VITE_CLERK_PUBLISHABLE_KEY;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

let hasErrors = false;
let hasWarnings = false;

console.log('📋 Checking .env file (development configuration)...\n');

// Check Clerk key
if (!clerkKey) {
  console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is not set in .env');
  hasErrors = true;
} else if (clerkKey.includes('<YOUR_TEST_KEY_HERE>') || clerkKey.includes('TODO')) {
  console.error('❌ VITE_CLERK_PUBLISHABLE_KEY has placeholder value');
  console.error('   You must replace it with your test key from Clerk Dashboard');
  console.error('   URL: https://dashboard.clerk.com → API Keys → Test tab');
  hasErrors = true;
} else if (clerkKey.startsWith('pk_live_')) {
  console.warn('⚠️  WARNING: Production Clerk key detected in .env (development file)');
  console.warn('   Production keys are domain-restricted and will cause authentication failures on localhost.');
  console.warn('   Use test key (pk_test_...) for local development.');
  console.warn('');
  console.warn('   Get test key from:');
  console.warn('   https://dashboard.clerk.com → API Keys → Test tab');
  console.warn('');
  console.warn('   Update .env: VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your-test-key>');
  hasWarnings = true;
} else if (clerkKey.startsWith('pk_test_')) {
  console.log('✅ Clerk key: Test key detected (correct for development)');
} else {
  console.warn('⚠️  WARNING: Unknown Clerk key format');
  console.warn(`   Key: ${clerkKey.substring(0, 30)}...`);
  console.warn('   Expected: pk_test_... (development) or pk_live_... (production)');
  hasWarnings = true;
}

console.log('');

// Check Supabase configuration
if (!supabaseUrl) {
  console.warn('⚠️  VITE_SUPABASE_URL is not set');
  hasWarnings = true;
} else {
  const isDevProject = supabaseUrl.includes('tislabgxitwtcqfwrpik');
  const isProdProject = supabaseUrl.includes('auvtsvmtfrbpvgyvfqlx');
  
  if (isDevProject) {
    console.log('✅ Supabase URL: DEV project (correct for development)');
  } else if (isProdProject) {
    console.warn('⚠️  WARNING: PROD Supabase URL detected in .env (development file)');
    console.warn('   Development should use DEV project: https://tislabgxitwtcqfwrpik.supabase.co');
    hasWarnings = true;
  } else {
    console.log(`ℹ️  Supabase URL: ${supabaseUrl}`);
  }
}

if (!supabaseKey) {
  console.warn('⚠️  VITE_SUPABASE_ANON_KEY is not set');
  hasWarnings = true;
} else {
  const isNewFormat = supabaseKey.startsWith('sb_publishable_');
  const isLegacyFormat = supabaseKey.startsWith('eyJ');
  
  if (isNewFormat) {
    console.log('✅ Supabase key: New format (sb_publishable_...)');
  } else if (isLegacyFormat) {
    console.warn('⚠️  WARNING: Legacy Supabase key format detected');
    console.warn('   Consider migrating to new Publishable API key format');
    hasWarnings = true;
  } else {
    console.log('ℹ️  Supabase key: Format detected');
  }
}

console.log('');

// Summary
console.log('='.repeat(50));
if (hasErrors) {
  console.error('❌ Validation Failed: Errors found');
  console.error('   Fix the errors above before continuing development');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Validation Complete: Warnings found');
  console.warn('   Review warnings above - development may not work correctly');
  process.exit(0);
} else {
  console.log('✅ Validation Complete: All checks passed!');
  console.log('   Development environment is correctly configured');
  process.exit(0);
}


#!/usr/bin/env tsx
/**
 * Verify JWT validation configuration in DEV Supabase project
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

function loadEnv(): Record<string, string> {
  try {
    const envPath = join(PROJECT_ROOT, '.env');
    const envContent = readFileSync(envPath, 'utf8');
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
    console.error('Could not read .env file:', error);
    return {};
  }
}

const env = loadEnv();

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const CLERK_DOMAIN = env.CLERK_DOMAIN || 'clerk.supafolio.app';
const CLERK_INSTANCE_ID = env.CLERK_INSTANCE_ID || 'ins_37VAGQw0JVza01qpTa6yUt8iVLY';

console.log('🔍 Verifying JWT Validation Configuration');
console.log('========================================\n');

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL not set in .env');
  process.exit(1);
}

console.log('📋 Current Configuration:');
console.log(`   Supabase URL: ${SUPABASE_URL}`);
console.log(`   Clerk Domain: ${CLERK_DOMAIN}`);
console.log(`   Clerk Instance ID: ${CLERK_INSTANCE_ID}`);
console.log('');

// Extract project ID from URL
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectId) {
  console.error('❌ Error: Could not extract project ID from Supabase URL');
  process.exit(1);
}

console.log('📋 Expected JWT Configuration in Supabase Dashboard:');
console.log(`   Project: ${projectId}`);
console.log(`   Dashboard: https://supabase.com/dashboard/project/${projectId}/auth/providers`);
console.log('');
console.log('   JWKS URL:');
console.log(`     https://${CLERK_DOMAIN}/.well-known/jwks.json`);
console.log('');
console.log('   Issuer:');
console.log(`     https://${CLERK_DOMAIN}`);
console.log('');
console.log('   Audience (Optional):');
console.log(`     ${CLERK_INSTANCE_ID}`);
console.log('');

// Test JWKS URL accessibility
console.log('🧪 Testing JWKS URL accessibility...');
try {
  const jwksUrl = `https://${CLERK_DOMAIN}/.well-known/jwks.json`;
  const response = await fetch(jwksUrl);
  
  if (response.ok) {
    const data = await response.json();
    console.log('   ✅ JWKS URL is accessible');
    console.log(`   ✅ Found ${data.keys?.length || 0} signing keys`);
  } else {
    console.log(`   ⚠️  JWKS URL returned status ${response.status}`);
  }
} catch (error: unknown) {
  console.log(`   ⚠️  Could not access JWKS URL: ${error instanceof Error ? error.message : String(error)}`);
}

console.log('\n' + '='.repeat(50));
console.log('📋 Manual Verification Required:');
console.log('='.repeat(50));
console.log('\n1. Go to Supabase Dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectId}/auth/providers`);
console.log('\n2. Check if Clerk is configured as a provider');
console.log('\n3. Verify JWT Settings (if available):');
console.log('   - JWKS URL should be set');
console.log('   - Issuer should be set');
console.log('   - Audience should be set (optional)');
console.log('\n4. If using Third-Party Auth:');
console.log('   - Go to Authentication → Providers');
console.log('   - Verify Clerk is enabled');
console.log('   - Check configuration matches above values');
console.log('\n✅ Configuration check complete!');


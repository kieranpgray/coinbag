#!/usr/bin/env tsx
/**
 * Verify Production Key Formats
 * 
 * This script helps verify if production is using legacy or new API keys
 * before disabling legacy keys.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface KeyInfo {
  name: string;
  location: string;
  format: 'legacy' | 'new' | 'unknown';
  length: number;
  safeToDisable: boolean;
}

function checkKeyFormat(key: string): 'legacy' | 'new' | 'unknown' {
  if (!key) return 'unknown';
  
  // Legacy JWT format: starts with eyJ, very long (200+ chars)
  if (key.startsWith('eyJ') && key.length > 200) {
    return 'legacy';
  }
  
  // New Publishable format: starts with sb_publishable_
  if (key.startsWith('sb_publishable_')) {
    return 'new';
  }
  
  // New Secret format: starts with sb_secret_ or similar
  if (key.startsWith('sb_')) {
    return 'new';
  }
  
  return 'unknown';
}

function loadEnv(): Record<string, string> {
  try {
    const envPath = join(process.cwd(), '.env');
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

const checks: KeyInfo[] = [];

// Check DEV project keys
const devAnonKey = env.VITE_SUPABASE_ANON_KEY;
if (devAnonKey) {
  const format = checkKeyFormat(devAnonKey);
  checks.push({
    name: 'DEV Frontend (VITE_SUPABASE_ANON_KEY)',
    location: '.env file',
    format,
    length: devAnonKey.length,
    safeToDisable: format === 'new'
  });
}

const devServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (devServiceKey) {
  const format = checkKeyFormat(devServiceKey);
  checks.push({
    name: 'DEV Scripts (SUPABASE_SERVICE_ROLE_KEY)',
    location: '.env file',
    format,
    length: devServiceKey.length,
    safeToDisable: format === 'new'
  });
}

console.log('🔍 Production Key Verification');
console.log('================================\n');

console.log('📋 DEV Project (tislabgxitwtcqfwrpik):\n');
checks.forEach(check => {
  const status = check.safeToDisable ? '✅' : '❌';
  const formatLabel = check.format === 'legacy' ? 'Legacy' : check.format === 'new' ? 'New' : 'Unknown';
  console.log(`${status} ${check.name}`);
  console.log(`   Location: ${check.location}`);
  console.log(`   Format: ${formatLabel}`);
  console.log(`   Length: ${check.length} chars`);
  console.log(`   Safe to disable: ${check.safeToDisable ? 'YES ✅' : 'NO ❌'}`);
  console.log('');
});

console.log('📋 PROD Project (auvtsvmtfrbpvgyvfqlx):\n');
console.log('⚠️  Manual Verification Required:\n');
console.log('1. Vercel Environment Variables:');
console.log('   - Go to: https://vercel.com/dashboard');
console.log('   - Project → Settings → Environment Variables');
console.log('   - Check: VITE_SUPABASE_ANON_KEY');
console.log('   - Format check:');
console.log('     • Legacy: Starts with "eyJ", 200+ chars');
console.log('     • New: Starts with "sb_publishable_", 46+ chars');
console.log('');
console.log('2. Edge Function Environment Variables:');
console.log('   - Go to: https://supabase.com/dashboard/project/auvtsvmtfrbpvgyvfqlx/functions/process-statement/settings');
console.log('   - Check: SUPABASE_ANON_KEY (auto-provided by Supabase)');
console.log('   - Note: This uses the project\'s anon key');
console.log('   - If project uses legacy anon key → Edge Function will break');
console.log('   - If project uses new Publishable key → Edge Function will work');
console.log('');

const allSafe = checks.every(c => c.safeToDisable);
if (allSafe && checks.length > 0) {
  console.log('✅ DEV Project: Safe to disable legacy keys');
} else if (checks.length > 0) {
  console.log('❌ DEV Project: Still using legacy keys - migrate first');
}

console.log('');
console.log('💡 Recommendation:');
console.log('   - Disable legacy keys in DEV project only (already migrated)');
console.log('   - Verify PROD keys before disabling in PROD project');
console.log('   - Keep PROD legacy keys active until verified/migrated');


/**
 * Diagnose data persistence issues
 * Run with: npx tsx scripts/diagnose-persistence.ts
 * 
 * This script checks if data exists in Supabase and helps diagnose RLS/JWT issues.
 * Note: For full diagnosis, you may need to check Supabase dashboard directly.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env
function loadEnv() {
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY; // Optional, for full diagnosis

const TABLES = [
  'assets',
  'liabilities',
  'accounts',
  'income',
  'subscriptions',
  'goals',
] as const;

async function diagnosePersistence() {
  console.log('🔍 Diagnosing Data Persistence Issues...\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables');
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is not set in .env');
    return false;
  }
  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set in .env');
    return false;
  }
  console.log('✅ Environment variables configured');
  if (supabaseServiceKey) {
    console.log('✅ Service role key found (will use for full diagnosis)');
  } else {
    console.log('⚠️  Service role key not found (limited diagnosis)');
    console.log('   To get full diagnosis, add SUPABASE_SERVICE_ROLE_KEY to .env');
    console.log('   (Find it in Supabase Dashboard → Settings → API → service_role key)');
  }
  console.log('');

  // Step 2: Connect to Supabase
  console.log('Step 2: Connecting to Supabase');
  const supabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Connected to Supabase');
  console.log(`   Using: ${supabaseServiceKey ? 'Service Role Key (bypasses RLS)' : 'Anon Key (subject to RLS)'}`);
  console.log('');

  // Step 3: Check each table for data
  console.log('Step 3: Checking tables for data');
  const results: Record<string, { count: number; sampleUserIds: string[]; hasNullUserIds: boolean }> = {};

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id, user_id')
        .limit(100);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" does not exist`);
          results[table] = { count: 0, sampleUserIds: [], hasNullUserIds: false };
        } else if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
          console.log(`⚠️  Table "${table}" - RLS blocking query (expected with anon key)`);
          console.log(`   This means RLS is enabled, but we can't see data without authentication`);
          console.log(`   → Check Supabase Dashboard → Table Editor → ${table} to see actual data`);
          results[table] = { count: -1, sampleUserIds: [], hasNullUserIds: false }; // -1 means RLS blocked
        } else {
          console.log(`⚠️  Table "${table}" - Error: ${error.message}`);
          results[table] = { count: -1, sampleUserIds: [], hasNullUserIds: false };
        }
      } else {
        const count = data?.length || 0;
        const userIds = (data || [])
          .map((row: any) => row.user_id)
          .filter((id: any) => id !== null && id !== undefined);
        const uniqueUserIds = [...new Set(userIds)] as string[];
        const hasNullUserIds = (data || []).some((row: any) => row.user_id === null || row.user_id === undefined);

        console.log(`✅ Table "${table}":`);
        console.log(`   Records found: ${count}`);
        if (count > 0) {
          console.log(`   Unique user_ids: ${uniqueUserIds.length}`);
          if (uniqueUserIds.length > 0) {
            console.log(`   Sample user_ids: ${uniqueUserIds.slice(0, 3).join(', ')}${uniqueUserIds.length > 3 ? '...' : ''}`);
          }
          if (hasNullUserIds) {
            console.log(`   ⚠️  WARNING: Some records have NULL user_id!`);
          }
        }

        results[table] = {
          count,
          sampleUserIds: uniqueUserIds.slice(0, 5),
          hasNullUserIds,
        };
      }
    } catch (error) {
      console.log(`❌ Error checking table "${table}":`, error instanceof Error ? error.message : String(error));
      results[table] = { count: -1, sampleUserIds: [], hasNullUserIds: false };
    }
  }

  console.log('');

  // Step 4: Test JWT function (if service role key available)
  if (supabaseServiceKey) {
    console.log('Step 4: Testing auth.jwt() function');
    try {
      const { data, error } = await supabase.rpc('test_jwt_extraction', {});
      if (error) {
        // Function might not exist, that's OK
        console.log('⚠️  Could not test JWT extraction (function may not exist)');
        console.log('   This is OK - JWT testing requires authenticated requests');
      } else {
        console.log('✅ JWT extraction test result:', data);
      }
    } catch (error) {
      console.log('⚠️  Could not test JWT extraction');
    }
    console.log('');
  }

  // Step 5: Summary and recommendations
  console.log('📝 Summary:');
  const tablesWithData = Object.entries(results).filter(([_, r]) => r.count > 0);
  const tablesBlockedByRLS = Object.entries(results).filter(([_, r]) => r.count === -1);
  const tablesWithNullUserIds = Object.entries(results).filter(([_, r]) => r.hasNullUserIds);

  if (tablesWithData.length > 0) {
    console.log(`   ✅ ${tablesWithData.length} table(s) contain data:`);
    for (const [table, result] of tablesWithData) {
      console.log(`      - ${table}: ${result.count} records`);
    }
  }

  if (tablesBlockedByRLS.length > 0 && !supabaseServiceKey) {
    console.log(`   ⚠️  ${tablesBlockedByRLS.length} table(s) blocked by RLS (need service role key to check):`);
    for (const [table] of tablesBlockedByRLS) {
      console.log(`      - ${table}`);
    }
  }

  if (tablesWithNullUserIds.length > 0) {
    console.log(`   ❌ ${tablesWithNullUserIds.length} table(s) have NULL user_id values:`);
    for (const [table] of tablesWithNullUserIds) {
      console.log(`      - ${table}`);
    }
    console.log('   → This indicates data was inserted without proper authentication');
    console.log('   → Fix: Configure Supabase JWT validation (see docs/CLERK_SUPABASE_JWT_SETUP.md)');
  }

  console.log('');

  // Step 6: Recommendations
  console.log('🔧 Recommendations:');
  
  if (tablesBlockedByRLS.length > 0 && !supabaseServiceKey) {
    console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to .env for full diagnosis');
    console.log('   (Find it in Supabase Dashboard → Settings → API → service_role key)');
  }

  if (tablesWithNullUserIds.length > 0) {
    console.log('2. ⚠️  CRITICAL: Data exists but has NULL user_id');
    console.log('   → This means Supabase JWT validation is not configured');
    console.log('   → Configure Clerk JWKS in Supabase Dashboard (see docs/CLERK_SUPABASE_JWT_SETUP.md)');
    console.log('   → After configuring, existing data may need to be fixed (see data recovery migration)');
  } else if (tablesWithData.length === 0 && tablesBlockedByRLS.length === TABLES.length) {
    console.log('1. ⚠️  No data found (or all blocked by RLS)');
    console.log('   → Check Supabase Dashboard → Table Editor to see if data exists');
    console.log('   → If data exists but RLS blocks it, JWT validation may not be configured');
    console.log('   → Configure Clerk JWKS in Supabase Dashboard (see docs/CLERK_SUPABASE_JWT_SETUP.md)');
  }

  console.log('2. Verify Supabase JWT configuration:');
  console.log('   → Go to Supabase Dashboard → Authentication → Settings');
  console.log('   → Check if JWKS URL is configured');
  console.log('   → See docs/CLERK_SUPABASE_JWT_SETUP.md for detailed steps');

  console.log('3. Test JWT validation:');
  console.log('   → Run: npx tsx scripts/test-jwt-validation.ts');
  console.log('   → (Requires being signed in to the app)');

  console.log('4. Check browser console when signed in:');
  console.log('   → Look for JWT-related errors');
  console.log('   → Check if auth.jwt() returns expected values');

  console.log('');

  return true;
}

diagnosePersistence().catch((error) => {
  console.error('Diagnosis failed:', error);
  process.exit(1);
});


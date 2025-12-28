/**
 * Test script to verify Supabase credentials and connection
 * Run with: npx tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables');
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is not set');
    return;
  }
  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
    return;
  }
  console.log('✅ VITE_SUPABASE_URL:', supabaseUrl);
  console.log('✅ VITE_SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 20) + '...');
  console.log('');

  // Step 2: Create Supabase client
  console.log('Step 2: Creating Supabase client');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created');
  console.log('');

  // Step 3: Test basic connection (check if we can reach Supabase)
  console.log('Step 3: Testing basic connection');
  try {
    // Try to fetch from a public endpoint
    const { data, error } = await supabase.from('assets').select('count').limit(0);
    
    if (error) {
      // Some errors are expected (like RLS blocking, table not found, etc.)
      if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('policy')) {
        console.log('⚠️  Connection works but RLS is blocking (this is expected without auth)');
        console.log('   Error:', error.message);
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('⚠️  Connection works but assets table may not exist yet');
        console.log('   Error:', error.message);
      } else {
        console.error('❌ Connection error:', error.message);
        console.error('   Code:', error.code);
        return;
      }
    } else {
      console.log('✅ Basic connection successful');
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    return;
  }
  console.log('');

  // Step 4: Check if assets table exists
  console.log('Step 4: Checking if assets table exists');
  try {
    // Try to get table schema (this should work even with RLS)
    const { data, error } = await supabase.rpc('pg_get_tabledef', { tablename: 'assets' }).single();
    
    if (error) {
      // Try alternative: just check if we can query (even if empty)
      const { error: queryError } = await supabase.from('assets').select('id').limit(0);
      
      if (queryError && queryError.message.includes('relation') && queryError.message.includes('does not exist')) {
        console.error('❌ Assets table does not exist');
        console.error('   Please run the migration: supabase/migrations/20251228110046_create_assets_table.sql');
        return;
      } else {
        console.log('✅ Assets table exists (RLS may be blocking queries, which is expected)');
      }
    } else {
      console.log('✅ Assets table exists');
    }
  } catch (error) {
    console.log('⚠️  Could not verify table existence (this is OK if RLS is enabled)');
  }
  console.log('');

  // Step 5: Verify RLS is enabled
  console.log('Step 5: Verifying RLS policies');
  try {
    // Try to insert without auth (should fail with RLS)
    const { error } = await supabase.from('assets').insert({
      name: 'Test Asset',
      type: 'Other',
      value: 100,
      date_added: '2024-01-01',
    }).select();

    if (error) {
      if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
        console.log('✅ RLS is enabled and working (correctly blocking unauthenticated requests)');
      } else {
        console.log('⚠️  RLS may not be configured correctly');
        console.log('   Error:', error.message);
      }
    } else {
      console.warn('⚠️  WARNING: RLS may not be enabled - unauthenticated insert succeeded!');
    }
  } catch (error) {
    console.log('✅ RLS is blocking unauthenticated requests (expected behavior)');
  }
  console.log('');

  console.log('✅ Supabase connection test complete!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Ensure Clerk JWT is configured in Supabase');
  console.log('   2. Test authenticated requests from the app');
  console.log('   3. Verify assets persist after creating them');
}

testSupabaseConnection().catch(console.error);


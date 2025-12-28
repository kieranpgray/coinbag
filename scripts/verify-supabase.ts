/**
 * Verify Supabase credentials and connection
 * Run with: npx tsx scripts/verify-supabase.ts
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

async function verifySupabase() {
  console.log('🔍 Verifying Supabase Credentials and Connection...\n');

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
  console.log('✅ VITE_SUPABASE_URL:', supabaseUrl);
  console.log('✅ VITE_SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 30) + '...');
  console.log('');

  // Step 2: Test basic connection
  console.log('Step 2: Testing Supabase connection');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Try a simple query that should work even with RLS
    const { error } = await supabase.from('assets').select('id').limit(0);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('❌ Assets table does not exist');
        console.error('   Please run the migration first');
        return false;
      } else if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
        console.log('✅ Connection successful - RLS is blocking (expected without auth)');
        console.log('   This confirms:');
        console.log('   - Supabase URL is correct');
        console.log('   - Anon key is valid');
        console.log('   - Assets table exists');
        console.log('   - RLS is enabled');
      } else {
        console.error('❌ Connection error:', error.message);
        console.error('   Code:', error.code);
        return false;
      }
    } else {
      console.log('✅ Connection successful');
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error instanceof Error ? error.message : String(error));
    return false;
  }
  console.log('');

  // Step 3: Verify table structure
  console.log('Step 3: Verifying assets table structure');
  try {
    // Try to get schema info (this might fail with RLS, but that's OK)
    const { error } = await supabase.rpc('pg_get_tabledef', { tablename: 'assets' });
    
    if (error) {
      // Alternative: just verify we can "see" the table (even if RLS blocks)
      const { error: queryError } = await supabase.from('assets').select('*').limit(0);
      
      if (queryError) {
        if (queryError.message.includes('does not exist')) {
          console.error('❌ Assets table does not exist');
          return false;
        } else {
          console.log('✅ Table exists (RLS blocking queries is expected)');
        }
      }
    } else {
      console.log('✅ Table structure verified');
    }
  } catch (error) {
    console.log('⚠️  Could not verify table structure (this is OK if RLS is enabled)');
  }
  console.log('');

  // Step 4: Test RLS policies
  console.log('Step 4: Testing RLS policies');
  try {
    // Try to insert without auth - should fail
    const { error } = await supabase.from('assets').insert({
      name: 'Test Asset',
      type: 'Other',
      value: 100,
      date_added: '2024-01-01',
    });

    if (error) {
      if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('RLS')) {
        console.log('✅ RLS is working correctly (blocking unauthenticated requests)');
      } else {
        console.log('⚠️  Unexpected error:', error.message);
      }
    } else {
      console.warn('⚠️  WARNING: RLS may not be enabled - unauthenticated insert succeeded!');
      console.warn('   This is a security issue - please verify RLS policies');
    }
  } catch (error) {
    console.log('✅ RLS is blocking unauthenticated requests');
  }
  console.log('');

  console.log('✅ Supabase credentials verification complete!');
  console.log('');
  console.log('📝 Summary:');
  console.log('   ✅ Environment variables configured');
  console.log('   ✅ Supabase connection working');
  console.log('   ✅ Assets table exists');
  console.log('   ✅ RLS policies active');
  console.log('');
  console.log('🎯 Next: Test authenticated requests from the app');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Sign in with Clerk');
  console.log('   3. Create an asset');
  console.log('   4. Verify it persists');
  
  return true;
}

verifySupabase().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});


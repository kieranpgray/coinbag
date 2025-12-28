/**
 * Test Supabase JWT Validation
 * 
 * This script helps verify if Supabase is correctly configured to validate Clerk JWTs.
 * 
 * IMPORTANT: This script requires you to be signed in to the app first.
 * 
 * Usage:
 * 1. Start the dev server: npm run dev
 * 2. Sign in with Clerk
 * 3. Open browser console
 * 4. Copy and paste the test code from this file's comments
 * 
 * OR run SQL directly in Supabase Dashboard → SQL Editor
 */

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

console.log('🔍 JWT Validation Test Instructions\n');
console.log('This test verifies if Supabase can validate Clerk JWTs and extract the user ID.\n');
console.log('='.repeat(80));
console.log('\n📋 OPTION 1: Test via Browser Console (Recommended)\n');
console.log('1. Start dev server: npm run dev');
console.log('2. Sign in with Clerk');
console.log('3. Open browser console (F12)');
console.log('4. Copy and paste this code:\n');
console.log(`
// Test JWT Validation in Browser Console
(async () => {
  const { useAuth } = await import('@clerk/clerk-react');
  const { createClient } = await import('@supabase/supabase-js');
  
  // Get Clerk token (you need to be in a React component context)
  // For testing, use the Clerk object directly:
  const clerk = window.Clerk;
  if (!clerk) {
    console.error('❌ Clerk not found. Make sure you are signed in.');
    return;
  }
  
  const token = await clerk.session?.getToken();
  if (!token) {
    console.error('❌ No JWT token available. Make sure you are signed in.');
    return;
  }
  
  console.log('✅ JWT token retrieved');
  
  // Decode token to see payload
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  console.log('📋 JWT Payload:', payload);
  console.log('📋 User ID (sub):', payload.sub);
  
  // Create Supabase client with JWT
  const supabaseUrl = '${supabaseUrl}';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: \`Bearer \${token}\`,
      },
    },
  });
  
  // Test query to see if RLS works
  console.log('\\n🔍 Testing RLS with authenticated request...');
  const { data, error } = await supabase.from('assets').select('id, user_id').limit(5);
  
  if (error) {
    console.error('❌ Query failed:', error.message);
    if (error.message.includes('JWT') || error.message.includes('token')) {
      console.error('   → This suggests JWT validation is not configured in Supabase');
    } else if (error.message.includes('permission') || error.message.includes('policy')) {
      console.error('   → RLS is blocking - this might mean auth.jwt() returns NULL');
      console.error('   → Check if Supabase JWT validation is configured');
    }
  } else {
    console.log('✅ Query succeeded!');
    console.log('📋 Results:', data);
    if (data && data.length > 0) {
      console.log('✅ RLS is working - you can see your data');
    } else {
      console.log('⚠️  No data returned (this is OK if you have no assets)');
    }
  }
  
  // Test auth.jwt() function via RPC (if available)
  console.log('\\n🔍 Testing auth.jwt() function...');
  const { data: jwtTest, error: jwtError } = await supabase.rpc('test_jwt_extraction', {});
  
  if (jwtError) {
    if (jwtError.message.includes('function') && jwtError.message.includes('does not exist')) {
      console.log('⚠️  test_jwt_extraction function does not exist');
      console.log('   → This is OK - we can test via SQL instead');
    } else {
      console.error('❌ RPC error:', jwtError.message);
    }
  } else {
    console.log('✅ auth.jwt() test result:', jwtTest);
  }
})();
`);

console.log('\n' + '='.repeat(80));
console.log('\n📋 OPTION 2: Test via Supabase SQL Editor\n');
console.log('1. Go to Supabase Dashboard → SQL Editor');
console.log('2. Run this SQL query:\n');
console.log(`
-- Test if auth.jwt() function works
-- This should return the 'sub' claim from the JWT if validation is configured
SELECT 
  auth.jwt() ->> 'sub' as user_id,
  auth.jwt() ->> 'exp' as expires_at,
  auth.jwt() ->> 'iat' as issued_at,
  CASE 
    WHEN auth.jwt() IS NULL THEN '❌ JWT validation NOT configured'
    WHEN auth.jwt() ->> 'sub' IS NULL THEN '⚠️  JWT validated but missing sub claim'
    ELSE '✅ JWT validation working'
  END as status
LIMIT 1;
`);

console.log('\n📋 Expected Results:');
console.log('✅ If JWT validation is configured:');
console.log('   - user_id should show your Clerk user ID');
console.log('   - status should be "✅ JWT validation working"');
console.log('');
console.log('❌ If JWT validation is NOT configured:');
console.log('   - user_id will be NULL');
console.log('   - status will be "❌ JWT validation NOT configured"');
console.log('   - This means you need to configure Clerk JWKS in Supabase Dashboard');

console.log('\n' + '='.repeat(80));
console.log('\n📋 OPTION 3: Check Supabase Dashboard Configuration\n');
console.log('1. Go to Supabase Dashboard → Authentication → Settings');
console.log('2. Look for "JWT Settings" or "JWKS URL" section');
console.log('3. Verify these settings:');
console.log('   - JWKS URL: https://secure-tapir-36.clerk.accounts.dev/.well-known/jwks.json');
console.log('   - Issuer: https://secure-tapir-36.clerk.accounts.dev');
console.log('   - Audience: (your Clerk Application ID)');
console.log('');
console.log('If these are not set, see docs/CLERK_SUPABASE_JWT_SETUP.md for setup instructions');

console.log('\n' + '='.repeat(80));
console.log('\n📋 Next Steps:\n');
console.log('1. Run one of the tests above');
console.log('2. If JWT validation is not configured, follow docs/CLERK_SUPABASE_JWT_SETUP.md');
console.log('3. After configuring, re-run the test to verify');
console.log('4. If data exists but RLS blocks it, see data recovery migration');

console.log('');


#!/usr/bin/env tsx
/**
 * Comprehensive JWT Configuration Verification Script
 * Tests what can be tested programmatically and provides exact configuration values
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'
const CLERK_DOMAIN = 'clerk.coinbag.app'
const CLERK_INSTANCE_ID = 'ins_37VAGQw0JVza01qpTa6yUt8iVLY'

console.log('🔍 Comprehensive JWT Configuration Verification')
console.log('='.repeat(60))
console.log('')

// Test 1: Check JWKS URL accessibility
console.log('📋 Test 1: Checking JWKS URL Accessibility')
console.log('─'.repeat(60))
try {
  const jwksUrl = `https://${CLERK_DOMAIN}/.well-known/jwks.json`
  console.log(`   URL: ${jwksUrl}`)
  
  const response = await fetch(jwksUrl)
  if (response.ok) {
    const data = await response.json()
    console.log('   ✅ JWKS URL is accessible')
    console.log(`   ✅ Found ${data.keys?.length || 0} keys`)
  } else {
    console.log(`   ⚠️  JWKS URL returned status ${response.status}`)
  }
} catch (error) {
  console.log(`   ❌ Error accessing JWKS URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Test 2: Check if test_jwt_extraction function exists
console.log('📋 Test 2: Checking JWT Test Function')
console.log('─'.repeat(60))
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

try {
  const { data, error } = await supabase.rpc('test_jwt_extraction', {})
  
  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('   ⚠️  test_jwt_extraction function does not exist')
      console.log('   → This function should be created by migration: 20251228170000_test_jwt_extraction_function.sql')
    } else {
      console.log(`   ⚠️  Function exists but returned error: ${error.message}`)
    }
  } else {
    console.log('   ✅ test_jwt_extraction function exists')
    console.log('   📋 Result:', JSON.stringify(data, null, 2))
  }
} catch (error) {
  console.log(`   ⚠️  Error calling function: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Configuration values
console.log('📋 Required Configuration Values')
console.log('='.repeat(60))
console.log('')

console.log('1. Clerk JWT Template Configuration')
console.log('   Location: https://dashboard.clerk.com → JWT Templates')
console.log('   ──────────────────────────────────────────────────────')
console.log('   Template Name: supabase (lowercase, exactly)')
console.log('   Algorithm: HS256')
console.log('   Signing Key: Get from Supabase Dashboard → Project Settings → API → JWT Secret')
console.log('   Lifetime: 3600 seconds')
console.log('   Claims:')
console.log('   {')
console.log('     "sub": "{{user.id}}",')
console.log('     "role": "authenticated",')
console.log(`     "aud": "${CLERK_INSTANCE_ID}",`)
console.log(`     "iss": "https://${CLERK_DOMAIN}",`)
console.log('     "exp": "{{date.now_plus_seconds(3600)}}",')
console.log('     "iat": "{{date.now}}"')
console.log('   }')
console.log('')

console.log('2. Supabase JWT Validation Configuration')
console.log(`   Location: https://app.supabase.com/project/auvtsvmtfrbpvgyvfqlx/auth/url-configuration`)
console.log('   ──────────────────────────────────────────────────────')
console.log(`   JWKS URL: https://${CLERK_DOMAIN}/.well-known/jwks.json`)
console.log(`   Issuer: https://${CLERK_DOMAIN}`)
console.log(`   Audience: ${CLERK_INSTANCE_ID}`)
console.log('   JWT Verification: Enabled (toggle ON)')
console.log('')

console.log('📋 Manual Verification Steps')
console.log('='.repeat(60))
console.log('')
console.log('1. Go to Clerk Dashboard → JWT Templates')
console.log('   → Check if template named "supabase" exists')
console.log('   → If not, create it with the configuration above')
console.log('')
console.log('2. Go to Supabase Dashboard → Authentication → Settings')
console.log('   → Verify/configure JWT validation with the values above')
console.log('   → Make sure JWT verification is enabled')
console.log('')
console.log('3. Test JWT Token (in browser console after sign-in):')
console.log('   window.Clerk.session.getToken({ template: \'supabase\' })')
console.log('     .then(token => {')
console.log('       if (token) {')
console.log('         const payload = JSON.parse(atob(token.split(\'.\')[1].replace(/-/g, \'+\').replace(/_/g, \'/\')));')
console.log('         console.log(\'✅ Token:\', payload);')
console.log('         console.log(\'Role:\', payload.role); // Should be "authenticated"')
console.log('         console.log(\'User ID:\', payload.sub);')
console.log('       }')
console.log('     });')
console.log('')
console.log('4. Test Supabase JWT Extraction (in Supabase SQL Editor while signed in):')
console.log('   SELECT test_jwt_extraction();')
console.log('   → Should return jwt_exists: true and has_sub: true')
console.log('')

console.log('✅ Verification script complete!')
console.log('   See docs/MANUAL_VERIFICATION_STEPS.md for detailed instructions')
console.log('')


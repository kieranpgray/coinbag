#!/usr/bin/env tsx
/**
 * Test Edge Function Endpoint
 * Tests if the process-statement Edge Function is accessible and responding
 */

const PROD_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'
const EDGE_FUNCTION_URL = `${PROD_URL}/functions/v1/process-statement`

console.log('🔍 Testing Edge Function Endpoint')
console.log('='.repeat(70))
console.log('')
console.log(`   URL: ${EDGE_FUNCTION_URL}`)
console.log('')

// Test 1: OPTIONS (CORS preflight)
console.log('📋 Test 1: CORS Preflight (OPTIONS)')
console.log('─'.repeat(70))
try {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'OPTIONS',
    headers: {
      'Authorization': `Bearer ${PROD_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Access-Control-Request-Method': 'POST'
    }
  })
  
  console.log(`   Status: ${response.status}`)
  console.log(`   CORS Headers:`)
  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers'
  ]
  
  corsHeaders.forEach(header => {
    const value = response.headers.get(header)
    if (value) {
      console.log(`      ${header}: ${value}`)
    }
  })
  
  if (response.status === 200 || response.status === 204 || response.status === 405) {
    console.log('   ✅ CORS preflight successful')
  } else {
    console.log(`   ⚠️  Unexpected status: ${response.status}`)
  }
} catch (error) {
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Test 2: POST with invalid payload (should return error, but confirms endpoint exists)
console.log('📋 Test 2: Endpoint Availability (POST with invalid payload)')
console.log('─'.repeat(70))
try {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PROD_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ test: true })
  })
  
  const text = await response.text()
  console.log(`   Status: ${response.status}`)
  
  if (response.status === 404) {
    console.log('   ❌ Edge Function not found (404)')
    console.log('   → Function may not be deployed')
  } else if (response.status === 401 || response.status === 403) {
    console.log('   ✅ Endpoint exists (authentication required)')
    console.log('   → This is expected - function requires valid JWT')
  } else if (response.status === 400 || response.status === 422) {
    console.log('   ✅ Endpoint exists and responding')
    console.log('   → Invalid payload rejected (expected)')
  } else {
    console.log(`   ⚠️  Status: ${response.status}`)
    console.log(`   Response: ${text.substring(0, 200)}`)
  }
} catch (error) {
  console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  console.log('   → This may indicate network/CORS issues, but function may still be deployed')
}
console.log('')

console.log('✅ Edge Function endpoint test complete')
console.log('')
console.log('📋 Note: Full functionality requires:')
console.log('   - Valid Clerk JWT token in Authorization header')
console.log('   - Valid statementImportId in request body')
console.log('   - Statement file uploaded to Supabase Storage')
console.log('')


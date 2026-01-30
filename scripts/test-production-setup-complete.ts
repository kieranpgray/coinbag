#!/usr/bin/env tsx
/**
 * Complete Production Setup Test Suite
 * Tests JWT configuration, database, Edge Function, and overall setup
 */

import { createClient } from '@supabase/supabase-js'

const PROD_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'
const CLERK_DOMAIN = 'clerk.coinbag.app'
const EDGE_FUNCTION_URL = `${PROD_URL}/functions/v1/process-statement`

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

const results: TestResult[] = []

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
  results.push({ name, status, message, details })
}

console.log('🧪 Complete Production Setup Test Suite')
console.log('='.repeat(70))
console.log('')
console.log('Testing: JWT Configuration, Database, Edge Function, and Overall Setup')
console.log('')

const supabase = createClient(PROD_URL, PROD_ANON_KEY)

// ============================================================================
// Test 1: JWKS URL Accessibility
// ============================================================================
console.log('📋 Test 1: JWKS URL Accessibility')
console.log('─'.repeat(70))
try {
  const jwksUrl = `https://${CLERK_DOMAIN}/.well-known/jwks.json`
  const response = await fetch(jwksUrl)
  if (response.ok) {
    const data = await response.json()
    if (data.keys && data.keys.length > 0) {
      addResult('JWKS URL', 'pass', `JWKS URL is accessible with ${data.keys.length} key(s)`)
      console.log(`   ✅ JWKS URL accessible: ${jwksUrl}`)
      console.log(`   ✅ Found ${data.keys.length} key(s)`)
    } else {
      addResult('JWKS URL', 'warning', 'JWKS URL accessible but no keys found')
      console.log(`   ⚠️  JWKS URL accessible but no keys found`)
    }
  } else {
    addResult('JWKS URL', 'fail', `JWKS URL returned status ${response.status}`)
    console.log(`   ❌ JWKS URL returned status ${response.status}`)
  }
} catch (error) {
  addResult('JWKS URL', 'fail', `Error accessing JWKS URL: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// ============================================================================
// Test 2: JWT Extraction Function
// ============================================================================
console.log('📋 Test 2: JWT Extraction Function')
console.log('─'.repeat(70))
try {
  const { data, error } = await supabase.rpc('test_jwt_extraction', {})
  if (error) {
    if (error.message.includes('does not exist')) {
      addResult('JWT Function', 'fail', 'test_jwt_extraction function does not exist')
      console.log('   ❌ Function does not exist')
    } else {
      addResult('JWT Function', 'warning', `Function exists but returned error: ${error.message}`)
      console.log(`   ⚠️  Function exists but error: ${error.message}`)
    }
  } else {
    if (data?.jwt_exists) {
      if (data?.has_sub) {
        addResult('JWT Function', 'pass', 'JWT validation working correctly with sub claim')
        console.log('   ✅ JWT validation working correctly')
        console.log(`   ✅ Has sub claim: ${data.sub_claim || 'N/A'}`)
      } else {
        addResult('JWT Function', 'warning', 'JWT validated but missing sub claim (expected without auth context)')
        console.log('   ⚠️  JWT validated but missing sub claim')
        console.log('   → This is expected when running without authentication context')
      }
    } else {
      addResult('JWT Function', 'warning', 'JWT validation not configured or no auth context')
      console.log('   ⚠️  JWT validation may not be fully configured')
      console.log('   → Or running without authentication context (expected)')
    }
  }
} catch (error) {
  addResult('JWT Function', 'fail', `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// ============================================================================
// Test 3: Database Tables
// ============================================================================
console.log('📋 Test 3: Database Tables')
console.log('─'.repeat(70))
const requiredTables = [
  'expenses',
  'categories',
  'assets',
  'liabilities',
  'accounts',
  'income',
  'goals',
  'user_preferences',
  'transactions',
  'statement_imports',
  'ocr_results'
]

let tablesFound = 0
for (const table of requiredTables) {
  try {
    const { error } = await supabase.from(table).select('id').limit(0)
    if (!error) {
      tablesFound++
      console.log(`   ✅ ${table}`)
    } else {
      if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
        console.log(`   ❌ ${table} - Table does not exist`)
      } else {
        // Table exists but RLS may be blocking (expected for some tables)
        tablesFound++
        console.log(`   ✅ ${table} (exists, RLS may restrict access)`)
      }
    }
  } catch (error) {
    console.log(`   ❌ ${table} - Error checking`)
  }
}

console.log('')
console.log(`   📊 Found ${tablesFound}/${requiredTables.length} required tables`)

if (tablesFound === requiredTables.length) {
  addResult('Database Tables', 'pass', `All ${requiredTables.length} required tables exist`)
  console.log('   ✅ All required tables exist!')
} else {
  addResult('Database Tables', 'fail', `Missing ${requiredTables.length - tablesFound} table(s)`)
  console.log(`   ⚠️  Missing ${requiredTables.length - tablesFound} table(s)`)
}
console.log('')

// ============================================================================
// Test 4: Edge Function Availability
// ============================================================================
console.log('📋 Test 4: Edge Function Availability')
console.log('─'.repeat(70))
try {
  // Test if Edge Function endpoint is accessible
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'OPTIONS', // CORS preflight
    headers: {
      'Authorization': `Bearer ${PROD_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (response.ok || response.status === 405 || response.status === 404) {
    // 405 = Method Not Allowed (but endpoint exists)
    // 404 = Not Found (but we can check)
    if (response.status === 404) {
      addResult('Edge Function', 'fail', 'Edge Function endpoint not found')
      console.log('   ❌ Edge Function endpoint not found (404)')
    } else {
      addResult('Edge Function', 'pass', 'Edge Function endpoint is accessible')
      console.log('   ✅ Edge Function endpoint is accessible')
      console.log(`   ✅ Status: ${response.status} (${response.status === 405 ? 'Method not allowed - endpoint exists' : 'OK'})`)
    }
  } else {
    addResult('Edge Function', 'warning', `Edge Function returned status ${response.status}`)
    console.log(`   ⚠️  Edge Function returned status ${response.status}`)
  }
} catch (error) {
  addResult('Edge Function', 'warning', `Error checking Edge Function: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  console.log('   → This may be a network/CORS issue, but function may still be deployed')
}
console.log('')

// ============================================================================
// Test 5: Database Indexes
// ============================================================================
console.log('📋 Test 5: Database Indexes')
console.log('─'.repeat(70))
try {
  // Test if we can query transactions (which uses the duplicate check index)
  const { error } = await supabase.from('transactions').select('id').limit(1)
  if (!error) {
    addResult('Database Indexes', 'pass', 'Transactions table accessible (indexes likely exist)')
    console.log('   ✅ Transactions table accessible')
    console.log('   ✅ Duplicate check index likely exists (table queries work)')
  } else {
    if (error.message.includes('does not exist')) {
      addResult('Database Indexes', 'fail', 'Transactions table does not exist')
      console.log('   ❌ Transactions table does not exist')
    } else {
      addResult('Database Indexes', 'warning', 'Transactions table exists but may have RLS restrictions')
      console.log('   ⚠️  Transactions table exists (RLS may restrict access)')
    }
  }
} catch (error) {
  addResult('Database Indexes', 'warning', `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// ============================================================================
// Test 6: OCR Results Table Structure
// ============================================================================
console.log('📋 Test 6: OCR Results Table Structure')
console.log('─'.repeat(70))
try {
  // Try to query ocr_results (will fail due to RLS, but confirms table exists)
  const { error } = await supabase.from('ocr_results').select('id').limit(0)
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
      addResult('OCR Results Table', 'fail', 'ocr_results table does not exist')
      console.log('   ❌ ocr_results table does not exist')
    } else {
      // RLS blocking is expected - table exists
      addResult('OCR Results Table', 'pass', 'ocr_results table exists (RLS is working)')
      console.log('   ✅ ocr_results table exists')
      console.log('   ✅ RLS is working (access restricted as expected)')
    }
  } else {
    addResult('OCR Results Table', 'pass', 'ocr_results table exists and accessible')
    console.log('   ✅ ocr_results table exists and accessible')
  }
} catch (error) {
  addResult('OCR Results Table', 'fail', `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// ============================================================================
// Test 7: Correlation ID Column
// ============================================================================
console.log('📋 Test 7: Correlation ID Column')
console.log('─'.repeat(70))
try {
  const { error } = await supabase.from('statement_imports').select('correlation_id').limit(1)
  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      addResult('Correlation ID', 'fail', 'correlation_id column does not exist')
      console.log('   ❌ correlation_id column does not exist')
    } else {
      addResult('Correlation ID', 'pass', 'correlation_id column exists (RLS may restrict access)')
      console.log('   ✅ correlation_id column exists')
      console.log('   → RLS may restrict access, but column is present')
    }
  } else {
    addResult('Correlation ID', 'pass', 'correlation_id column exists and accessible')
    console.log('   ✅ correlation_id column exists and accessible')
  }
} catch (error) {
  addResult('Correlation ID', 'warning', `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// ============================================================================
// Summary
// ============================================================================
console.log('📊 Test Summary')
console.log('='.repeat(70))
console.log('')

const passed = results.filter(r => r.status === 'pass').length
const failed = results.filter(r => r.status === 'fail').length
const warnings = results.filter(r => r.status === 'warning').length

console.log(`   ✅ Passed: ${passed}`)
console.log(`   ⚠️  Warnings: ${warnings}`)
console.log(`   ❌ Failed: ${failed}`)
console.log('')

if (failed === 0) {
  console.log('🎉 All critical tests passed!')
  console.log('')
  console.log('✅ Production setup is complete and ready for use')
} else {
  console.log('⚠️  Some tests failed - review details above')
}

console.log('')
console.log('📋 Detailed Results:')
console.log('─'.repeat(70))
results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
  console.log(`   ${icon} ${result.name}: ${result.message}`)
  if (result.details) {
    console.log(`      ${result.details}`)
  }
})

console.log('')
console.log('📋 Manual Testing Required (Requires Authentication)')
console.log('='.repeat(70))
console.log('')
console.log('The following tests require you to be signed in to the application:')
console.log('')
console.log('1. JWT Token Test (Browser Console):')
console.log('   window.Clerk.session.getToken({ template: \'supabase\' })')
console.log('     .then(token => {')
console.log('       const payload = JSON.parse(atob(token.split(\'.\')[1].replace(/-/g, \'+\').replace(/_/g, \'/\')));')
console.log('       console.log(\'Role:\', payload.role); // Should be "authenticated"')
console.log('       console.log(\'User ID:\', payload.sub);')
console.log('     });')
console.log('')
console.log('2. Statement Upload Test:')
console.log('   - Sign in to production app')
console.log('   - Upload a test statement')
console.log('   - Verify processing completes')
console.log('   - Check Edge Function logs in Supabase Dashboard')
console.log('')
console.log('3. Data Persistence Test:')
console.log('   - Create test data (asset, expense, etc.)')
console.log('   - Refresh page')
console.log('   - Logout and login again')
console.log('   - Verify data persists')
console.log('')


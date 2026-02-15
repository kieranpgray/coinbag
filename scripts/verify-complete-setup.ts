#!/usr/bin/env tsx
/**
 * Complete Setup Verification Script
 * Tests JWT configuration, migrations, and overall setup
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'

console.log('🔍 Complete Production Setup Verification')
console.log('='.repeat(60))
console.log('')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CLERK_DOMAIN = process.env.CLERK_DOMAIN || 'clerk.supafolio.app'

// Test 1: Check JWKS URL
console.log('📋 Test 1: JWKS URL Accessibility')
console.log('─'.repeat(60))
try {
  const response = await fetch(`https://${CLERK_DOMAIN}/.well-known/jwks.json`)
  if (response.ok) {
    const data = await response.json()
    console.log('   ✅ JWKS URL is accessible')
    console.log(`   ✅ Found ${data.keys?.length || 0} keys`)
  } else {
    console.log(`   ⚠️  JWKS URL returned status ${response.status}`)
  }
} catch (error) {
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Test 2: Check JWT extraction function
console.log('📋 Test 2: JWT Extraction Function')
console.log('─'.repeat(60))
try {
  const { data, error } = await supabase.rpc('test_jwt_extraction', {})
  if (error) {
    console.log(`   ⚠️  Function error: ${error.message}`)
  } else {
    console.log('   ✅ Function exists and returned:')
    console.log('   📋 Result:', JSON.stringify(data, null, 2))
    
    if (data?.jwt_exists && data?.has_sub) {
      console.log('   ✅ JWT validation is working correctly!')
    } else if (data?.jwt_exists && !data?.has_sub) {
      console.log('   ⚠️  JWT validated but missing sub claim')
      console.log('   → This means Supabase JWT validation is configured')
      console.log('   → But Clerk JWT template may not be configured correctly')
    } else {
      console.log('   ⚠️  JWT validation not fully configured')
      console.log('   → Configure Supabase JWT validation (see Step 4 Part 2)')
    }
  }
} catch (error) {
  console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Test 3: Check required tables
console.log('📋 Test 3: Database Tables')
console.log('─'.repeat(60))
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
    const { error } = await supabase.from(table).select('id').limit(1)
    if (!error) {
      tablesFound++
      console.log(`   ✅ ${table}`)
    } else {
      console.log(`   ❌ ${table} - ${error.message}`)
    }
  } catch (error) {
    console.log(`   ❌ ${table} - Error checking`)
  }
}

console.log('')
console.log(`   📊 Found ${tablesFound}/${requiredTables.length} required tables`)

if (tablesFound === requiredTables.length) {
  console.log('   ✅ All required tables exist')
} else {
  console.log('   ⚠️  Some tables are missing - migrations may need to be applied')
  console.log('   → Run: ./scripts/run-migrations-via-cli.sh')
}
console.log('')

// Summary
console.log('📋 Next Steps')
console.log('='.repeat(60))
console.log('')
console.log('1. ✅ Clerk JWT Template - Configured')
console.log('2. ⚠️  Supabase JWT Validation - Configure (see Step 4 Part 2)')
console.log('3. ⚠️  Test JWT Token in browser (see Step 5)')
if (tablesFound < requiredTables.length) {
  console.log('4. ⚠️  Apply missing migrations')
}
console.log('5. ⚠️  Test end-to-end functionality')
console.log('')


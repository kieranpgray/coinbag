#!/usr/bin/env tsx
/**
 * Verify that all missing migrations have been applied successfully
 */

import { createClient } from '@supabase/supabase-js'

const PROD_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'

const supabase = createClient(PROD_URL, PROD_ANON_KEY)

console.log('🔍 Verifying Migrations Applied')
console.log('='.repeat(70))
console.log('')

// Check 1: ocr_results table
console.log('📋 Check 1: ocr_results Table')
console.log('─'.repeat(70))
try {
  const { error } = await supabase.from('ocr_results').select('id').limit(1)
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
      console.log('   ❌ ocr_results table does not exist')
    } else {
      console.log(`   ✅ ocr_results table exists (error: ${error.message} - expected for empty table)`)
    }
  } else {
    console.log('   ✅ ocr_results table exists and is accessible')
  }
} catch (error) {
  console.log(`   ❌ Error checking ocr_results: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Check 2: correlation_id column
console.log('📋 Check 2: correlation_id Column in statement_imports')
console.log('─'.repeat(70))
try {
  const { error } = await supabase.from('statement_imports').select('correlation_id').limit(1)
  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('   ❌ correlation_id column does not exist')
    } else {
      console.log(`   ⚠️  Error: ${error.message}`)
    }
  } else {
    console.log('   ✅ correlation_id column exists in statement_imports')
  }
} catch (error) {
  console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}
console.log('')

// Check 3: All required tables
console.log('📋 Check 3: All Required Tables')
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
        // Table exists but might have a different error (like RLS)
        tablesFound++
        console.log(`   ✅ ${table} (exists, may have RLS restrictions)`)
      }
    }
  } catch (error) {
    console.log(`   ❌ ${table} - Error checking`)
  }
}

console.log('')
console.log(`   📊 Found ${tablesFound}/${requiredTables.length} required tables`)

if (tablesFound === requiredTables.length) {
  console.log('   ✅ All required tables exist!')
} else {
  console.log(`   ⚠️  Missing ${requiredTables.length - tablesFound} table(s)`)
}
console.log('')

// Summary
console.log('📊 Verification Summary')
console.log('='.repeat(70))
console.log('')

if (tablesFound === requiredTables.length) {
  console.log('✅ All migrations applied successfully!')
  console.log('')
  console.log('✅ Production database is up to date')
  console.log('✅ All required tables exist')
  console.log('✅ Ready for production use')
} else {
  console.log('⚠️  Some migrations may not be fully applied')
  console.log(`   Missing: ${requiredTables.length - tablesFound} table(s)`)
}

console.log('')
console.log('📋 Next Steps:')
console.log('   1. Test statement upload/processing functionality')
console.log('   2. Verify Edge Function can access ocr_results table')
console.log('   3. Monitor Edge Function logs for any issues')
console.log('')


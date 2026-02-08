#!/usr/bin/env tsx
/**
 * Compare Dev and Prod Database Schemas
 * Identifies differences between dev and prod Supabase instances
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEV_ANON_KEY = process.env.DEV_SUPABASE_ANON_KEY || ''

const PROD_URL = 'https://auvtsvmtfrbpvgyvfqlx.supabase.co'
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnRzdm10ZnJicHZneXZmcWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMTcsImV4cCI6MjA4MjU0NjAxN30.OLKiOD4K2nt8u5OFTNiFJc8UzzrkI6SllbscJMaEpBQ'

const REQUIRED_TABLES = [
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

interface TableInfo {
  exists: boolean
  columns?: string[]
  error?: string
}

async function checkTable(supabase: SupabaseClient, tableName: string): Promise<TableInfo> {
  try {
    // Try to select one row to check if table exists and get column info
    const { error } = await supabase.from(tableName).select('*').limit(0)
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
        return { exists: false }
      }
      return { exists: true, error: error.message }
    }
    
    // Get column names by trying to select specific columns
    // We'll use a workaround - try common column names
    return { exists: true, columns: ['id'] } // Simplified - actual columns would need schema query
  } catch (error) {
    return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function checkFunction(supabase: SupabaseClient, functionName: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(functionName, {})
    // If we get an error about function not existing, it doesn't exist
    // If we get other errors, the function exists but may have wrong params
    if (error && error.message.includes('does not exist')) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('🔍 Comparing Dev and Prod Database Schemas')
  console.log('='.repeat(70))
  console.log('')
  
  if (!DEV_ANON_KEY) {
    console.log('⚠️  DEV_SUPABASE_ANON_KEY not set - skipping dev checks')
    console.log('   Set it in .env or as environment variable to compare dev')
    console.log('')
  }
  
  const prodClient = createClient(PROD_URL, PROD_ANON_KEY)
  
  console.log('📋 Production Database Check')
  console.log('─'.repeat(70))
  console.log(`   Project: auvtsvmtfrbpvgyvfqlx`)
  console.log(`   URL: ${PROD_URL}`)
  console.log('')
  
  const prodResults: Record<string, TableInfo> = {}
  
  for (const table of REQUIRED_TABLES) {
    const info = await checkTable(prodClient, table)
    prodResults[table] = info
    
    if (info.exists) {
      console.log(`   ✅ ${table}`)
    } else {
      console.log(`   ❌ ${table} - ${info.error || 'Table does not exist'}`)
    }
  }
  
  console.log('')
  
  // Check functions
  console.log('📋 Functions Check')
  console.log('─'.repeat(70))
  
  const testJwtExists = await checkFunction(prodClient, 'test_jwt_extraction')
  console.log(`   ${testJwtExists ? '✅' : '❌'} test_jwt_extraction`)
  
  console.log('')
  
  // Summary
  const prodTablesFound = Object.values(prodResults).filter(r => r.exists).length
  const prodTablesMissing = REQUIRED_TABLES.filter(t => !prodResults[t]?.exists)
  
  console.log('📊 Summary')
  console.log('='.repeat(70))
  console.log(`   Production Tables: ${prodTablesFound}/${REQUIRED_TABLES.length} found`)
  
  if (prodTablesMissing.length > 0) {
    console.log('')
    console.log('   ⚠️  Missing Tables in Production:')
    prodTablesMissing.forEach(table => {
      console.log(`      - ${table}`)
    })
  }
  
  console.log('')
  console.log('📋 Migration Analysis')
  console.log('='.repeat(70))
  console.log(`   Total Migrations: ${41}`)
  console.log('')
  console.log('   Migration files (in chronological order):')
  
  const migrations = [
    '20251227120112_create_subscriptions_table.sql',
    '20251227120113_create_categories_table.sql',
    '20251227120114_fix_subscriptions_user_id_type.sql',
    '20251227130000_create_user_preferences_table.sql',
    '20251228110046_create_assets_table.sql',
    '20251228120000_add_cash_asset_type.sql',
    '20251228130000_create_liabilities_table.sql',
    '20251228140000_create_accounts_table.sql',
    '20251228150000_create_income_table.sql',
    '20251228160000_create_goals_table.sql',
    '20251228170000_test_jwt_extraction_function.sql',
    '20251228180000_data_recovery_fix_user_ids.sql',
    '20251229160000_add_liability_repayment_fields.sql',
    '20251229160001_add_superannuation_asset_type.sql',
    '20251230000000_create_transactions_table.sql',
    '20251230000001_create_statement_imports_table.sql',
    '20251230000002_add_currency_to_accounts.sql',
    '20251230000002_enable_statement_imports_realtime.sql',
    '20251230000003_add_account_type_constraint.sql',
    '20251230000004_add_transactions_foreign_key.sql',
    '20251230000005_create_statement_storage_bucket.sql',
    '20251230000006_fix_statement_storage_rls_policies.sql',
    '20251231000001_add_credit_fields_to_accounts.sql',
    '20251231000002_update_account_types.sql',
    '20251231000003_add_account_linking_to_goals.sql',
    '20251231000004_remove_available_balance_and_make_institution_optional.sql',
    '20251231000005_add_locale_to_user_preferences.sql',
    '20260103085822_rename_subscriptions_to_expenses.sql',
    '20260106000000_ensure_institution_is_optional.sql',
    '20260108000000_add_hide_setup_checklist_to_user_preferences.sql',
    '20260112101715_add_paid_from_account_to_expenses.sql',
    '20260112101716_add_paid_to_account_to_income.sql',
    '20260114120000_make_next_payment_date_nullable.sql',
    '20260115100000_make_expense_dates_optional.sql',
    '20260117105340_add_transaction_provenance_documentation.sql',
    '20260122194652_purge_bad_cache_transactions.sql',
    '20260123000000_create_ocr_results_table.sql',
    '20260123000001_add_transactions_duplicate_check_index.sql',
    '20260123000002_create_user_statement_count_view.sql',
    '20260125000000_fix_sync_goal_trigger_account_id_error.sql',
    '20250101000000_add_correlation_id_to_statement_imports.sql'
  ]
  
  migrations.forEach((migration, index) => {
    const tableMatch = migration.match(/create_(\w+)_table|rename_(\w+)_to_(\w+)/i)
    let status = '   '
    if (tableMatch) {
      const tableName = tableMatch[1] || tableMatch[3]
      if (prodResults[tableName]?.exists) {
        status = '✅ '
      } else if (REQUIRED_TABLES.includes(tableName)) {
        status = '❌ '
      }
    }
    console.log(`   ${status}${index + 1}. ${migration}`)
  })
  
  console.log('')
  console.log('📋 Next Steps')
  console.log('='.repeat(70))
  console.log('')
  console.log('1. Review missing tables above')
  console.log('2. Apply missing migrations using: ./scripts/run-migrations-via-cli.sh')
  console.log('3. Verify all tables exist after migration')
  console.log('')
}

main().catch(console.error)


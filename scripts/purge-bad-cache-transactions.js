#!/usr/bin/env node
/**
 * Purge fabricated transactions from bad cached import
 * This script deletes transactions from the bad cached import and marks it as invalid
 */

import { createClient } from '@supabase/supabase-js'

const BAD_CACHE_IMPORT_ID = '90beccdb-d1ea-4dd8-af03-56c4156ad672'

// Get Supabase credentials from environment or use defaults
const PROJECT_REF = 'tislabgxitwtcqfwrpik' // From project configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase Service Role Key')
  console.error('')
  console.error('Required environment variable:')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY')
  console.error('')
  console.error('You can find this in:')
  console.error('  Supabase Dashboard → Project Settings → API → service_role key')
  console.error('')
  console.error('Or set it temporarily:')
  console.error(`  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'`)
  console.error(`  node scripts/purge-bad-cache-transactions.js`)
  console.error('')
  process.exit(1)
}

console.log(`Using Supabase URL: ${SUPABASE_URL}`)
console.log('')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function purgeBadCache() {
  console.log(`🔧 Purging bad cache transactions from import: ${BAD_CACHE_IMPORT_ID}`)
  console.log('')

  try {
    // Step 1: Delete transactions
    console.log('Step 1: Deleting transactions...')
    const { data: deletedTransactions, error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('statement_import_id', BAD_CACHE_IMPORT_ID)
      .select('id')

    if (deleteError) {
      throw new Error(`Failed to delete transactions: ${deleteError.message}`)
    }

    const deletedCount = deletedTransactions?.length || 0
    console.log(`✅ Deleted ${deletedCount} transactions`)
    console.log('')

    // Step 2: Mark the bad cached import as failed
    console.log('Step 2: Marking bad cached import as failed...')
    const { error: updateError } = await supabase
      .from('statement_imports')
      .update({
        status: 'failed',
        error_message: 'Cache invalidated - contained fabricated transactions',
        updated_at: new Date().toISOString()
      })
      .eq('id', BAD_CACHE_IMPORT_ID)

    if (updateError) {
      throw new Error(`Failed to update statement_import: ${updateError.message}`)
    }

    console.log('✅ Marked bad cached import as failed')
    console.log('')

    // Step 3: Find and mark imports that copied from this bad cache
    console.log('Step 3: Finding imports that copied from bad cache...')
    
    // First, get sample transaction descriptions from the bad cache (if any remain)
    // Since we deleted them, we'll use a different approach - check imports that have
    // similar characteristics or were created around the same time
    const { data: badImport } = await supabase
      .from('statement_imports')
      .select('created_at, user_id, account_id')
      .eq('id', BAD_CACHE_IMPORT_ID)
      .single()

    if (badImport) {
      // Find imports created after the bad cache that might have copied from it
      const { data: affectedImports, error: findError } = await supabase
        .from('statement_imports')
        .select('id, status, error_message')
        .eq('parsing_method', 'ocr')
        .eq('user_id', badImport.user_id)
        .gte('created_at', badImport.created_at)
        .neq('id', BAD_CACHE_IMPORT_ID)
        .limit(10)

      if (!findError && affectedImports && affectedImports.length > 0) {
        // Update error message for affected imports
        for (const importRecord of affectedImports) {
          const newErrorMessage = (importRecord.error_message || '') + 
            (importRecord.error_message ? '; ' : '') + 
            'Copied from invalidated cache'
          
          await supabase
            .from('statement_imports')
            .update({
              error_message: newErrorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', importRecord.id)
        }
        console.log(`✅ Marked ${affectedImports.length} potentially affected imports`)
      } else {
        console.log('ℹ️  No additional imports found that copied from bad cache')
      }
    }

    console.log('')
    console.log('✅ Bad cache transactions purged successfully')
    console.log('')
    console.log('Next steps:')
    console.log('1. Upload a new statement - it will extract via OCR (cache validation enabled)')
    console.log('2. Verify transactions match actual statement content')
    console.log('3. Check edge function logs show OCR extraction and validation')

  } catch (error) {
    console.error('❌ Error purging bad cache:', error.message)
    console.error('')
    console.error('You can also run this SQL manually in Supabase Dashboard → SQL Editor:')
    console.error('')
    console.error(`DELETE FROM transactions WHERE statement_import_id = '${BAD_CACHE_IMPORT_ID}';`)
    console.error(`UPDATE statement_imports SET status = 'failed', error_message = 'Cache invalidated - contained fabricated transactions', updated_at = NOW() WHERE id = '${BAD_CACHE_IMPORT_ID}';`)
    process.exit(1)
  }
}

// Run the purge
purgeBadCache().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})


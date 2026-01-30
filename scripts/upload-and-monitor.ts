#!/usr/bin/env tsx
/**
 * Upload PDF and monitor processing
 * 
 * This script uploads the anz-statement.pdf file programmatically
 * and monitors the processing to collect all checkpoint data.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tislabgxitwtcqfwrpik.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get Clerk token from browser (this would need to be passed in)
// For now, we'll query existing data
async function getRecentStatementImports() {
  const { data, error } = await supabase
    .from('statement_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return [];
  }

  return data || [];
}

async function getTransactionCount(statementImportId: string) {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('statement_import_id', statementImportId);

  if (error) {
    console.error('Error:', error.message);
    return 0;
  }

  return count || 0;
}

async function main() {
  console.log('=== Recent Statement Imports ===\n');
  
  const imports = await getRecentStatementImports();
  
  if (imports.length === 0) {
    console.log('No statement imports found.');
    return;
  }

  for (const imp of imports) {
    console.log(`📄 ${imp.file_name || 'Unknown'}`);
    console.log(`   ID: ${imp.id}`);
    console.log(`   Status: ${imp.status}`);
    console.log(`   Correlation ID: ${imp.correlation_id || 'N/A'}`);
    console.log(`   Total Transactions: ${imp.total_transactions || 'N/A'}`);
    console.log(`   Imported Transactions: ${imp.imported_transactions || 'N/A'}`);
    
    const actualCount = await getTransactionCount(imp.id);
    console.log(`   Database Count: ${actualCount}`);
    
    if (imp.correlation_id) {
      console.log(`   Logs: https://supabase.com/dashboard/project/tislabgxitwtcqfwrpik/functions/process-statement/logs`);
      console.log(`   Filter by: correlation_id = ${imp.correlation_id}`);
    }
    console.log('');
  }
}

main();



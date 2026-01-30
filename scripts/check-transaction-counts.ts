#!/usr/bin/env tsx
/**
 * Check transaction counts in database
 */

import { createClient } from '@supabase/supabase-js';
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

async function main() {
  const accountId = 'e265a35b-0f83-4e60-b42a-3f7828f9be3e'; // From browser URL
  
  console.log('=== Transaction Count Analysis ===\n');
  console.log(`Account ID: ${accountId}\n`);
  
  // Total transactions for account
  const { count: totalCount, error: totalError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);
  
  if (totalError) {
    console.error('Error:', totalError.message);
    return;
  }
  
  console.log(`Total transactions for account: ${totalCount || 0}`);
  
  // Transactions with statement_import_id
  const { count: withStatementCount, error: withStatementError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .not('statement_import_id', 'is', null);
  
  if (withStatementError) {
    console.error('Error:', withStatementError.message);
    return;
  }
  
  console.log(`Transactions with statement_import_id: ${withStatementCount || 0}`);
  
  // Transactions without statement_import_id
  const { count: withoutStatementCount, error: withoutStatementError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .is('statement_import_id', null);
  
  if (withoutStatementError) {
    console.error('Error:', withoutStatementError.message);
    return;
  }
  
  console.log(`Transactions without statement_import_id: ${withoutStatementCount || 0}`);
  
  // Group by statement_import_id
  const { data: grouped, error: groupedError } = await supabase
    .from('transactions')
    .select('statement_import_id')
    .eq('account_id', accountId)
    .not('statement_import_id', 'is', null);
  
  if (groupedError) {
    console.error('Error:', groupedError.message);
    return;
  }
  
  const countsByStatement: Record<string, number> = {};
  grouped?.forEach(tx => {
    const sid = tx.statement_import_id;
    if (sid) {
      countsByStatement[sid] = (countsByStatement[sid] || 0) + 1;
    }
  });
  
  console.log('\n=== Transactions by Statement Import ===');
  Object.entries(countsByStatement).forEach(([sid, count]) => {
    console.log(`  ${sid}: ${count} transactions`);
  });
  
  // Get statement imports
  const { data: imports, error: importsError } = await supabase
    .from('statement_imports')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (importsError) {
    console.error('Error:', importsError.message);
    return;
  }
  
  console.log('\n=== Recent Statement Imports ===');
  for (const imp of imports || []) {
    const txCount = countsByStatement[imp.id] || 0;
    console.log(`\n${imp.file_name || 'Unknown'}`);
    console.log(`  ID: ${imp.id}`);
    console.log(`  Status: ${imp.status}`);
    console.log(`  Total Transactions: ${imp.total_transactions || 'N/A'}`);
    console.log(`  Imported Transactions: ${imp.imported_transactions || 'N/A'}`);
    console.log(`  Actual DB Count: ${txCount}`);
    console.log(`  Correlation ID: ${imp.correlation_id || 'N/A'}`);
  }
}

main();


